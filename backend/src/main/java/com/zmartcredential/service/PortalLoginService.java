package com.zmartcredential.service;

import com.zmartcredential.config.AppProperties;
import com.zmartcredential.exception.BadRequestException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.openqa.selenium.By;
import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.Keys;
import org.openqa.selenium.OutputType;
import org.openqa.selenium.PageLoadStrategy;
import org.openqa.selenium.SessionNotCreatedException;
import org.openqa.selenium.TakesScreenshot;
import org.openqa.selenium.TimeoutException;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebDriverException;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.springframework.stereotype.Service;

import java.net.InetAddress;
import java.net.URI;
import java.net.UnknownHostException;
import java.time.Duration;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;

/**
 * Signs in to a payer's provider portal with a headless Chrome and reports what the portal showed afterwards
 * (outcome, final URL, page title, a screenshot and some page text).
 *
 * Portals are not built for this: most are JavaScript sign-in pages, many ask for a one-time code (MFA) or a CAPTCHA
 * after the password. The login is generic — it finds the username and password fields (also on two-step pages where
 * the password appears after "Next"), submits, and classifies the result. Anything it cannot get past (MFA, CAPTCHA,
 * unusual pages) is reported so staff can finish in the portal themselves.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PortalLoginService {

    /** logged_in | login_failed | mfa_required | captcha | no_login_form | error */
    public record Result(String outcome, String message, String finalUrl, String pageTitle, String screenshot,
                         String pageText, long durationMs) {
    }

    private static final Pattern USERNAME_HINT = Pattern.compile("user|email|e-mail|login|account|signin|sign-in|ident|uid", Pattern.CASE_INSENSITIVE);
    private static final Pattern LOGIN_LINK = Pattern.compile("^\\s*(provider\\s+)?(log\\s*-?\\s*in|sign\\s*-?\\s*in|login)\\s*$", Pattern.CASE_INSENSITIVE);
    private static final Pattern NEXT_BUTTON = Pattern.compile("next|continue|log\\s*-?\\s*in|sign\\s*-?\\s*in|submit|login", Pattern.CASE_INSENSITIVE);
    private static final Pattern MFA = Pattern.compile("verification code|one[- ]time|passcode|authenticator|two[- ]step|2[- ]step|"
            + "multi[- ]factor|\\bmfa\\b|security code|verify your identity|enter the code|send code|text me a code", Pattern.CASE_INSENSITIVE);
    private static final Pattern CAPTCHA = Pattern.compile("recaptcha|hcaptcha|turnstile|captcha", Pattern.CASE_INSENSITIVE);

    private final AppProperties props;
    /** At most two browsers at a time — each one uses a few hundred MB of memory. */
    private final Semaphore slots = new Semaphore(2);

    public Result login(String portalUrl, String username, String password) {
        long start = System.currentTimeMillis();
        AppProperties.PortalLogin cfg = props.portalLogin();
        if (cfg == null || !cfg.enabled()) {
            return new Result("error", "Automatic portal login is switched off on this server", null, null, null, null, 0);
        }
        URI uri = checkUrl(portalUrl, cfg.allowPrivateHosts());
        boolean acquired = false;
        try {
            acquired = slots.tryAcquire(20, TimeUnit.SECONDS);
            if (!acquired) return new Result("error", "Two portal logins are already running — try again in a moment", null, null, null, null, 0);
            return run(uri.toString(), username, password, cfg, start);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return new Result("error", "Interrupted", null, null, null, null, System.currentTimeMillis() - start);
        } finally {
            if (acquired) slots.release();
        }
    }

    private Result run(String url, String username, String password, AppProperties.PortalLogin cfg, long start) {
        int timeout = cfg.timeoutSeconds() > 0 ? cfg.timeoutSeconds() : 60;
        ChromeOptions options = new ChromeOptions();
        options.addArguments("--headless=new", "--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu",
                "--window-size=1366,900", "--lang=en-US", "--disable-extensions", "--no-first-run");
        if (cfg.chromeBinary() != null && !cfg.chromeBinary().isBlank()) options.setBinary(cfg.chromeBinary());
        // Start as soon as the page structure is ready: portals load slow third-party scripts we do not need to wait for.
        options.setPageLoadStrategy(PageLoadStrategy.EAGER);
        options.setPageLoadTimeout(Duration.ofSeconds(Math.min(40, timeout)));

        WebDriver driver;
        try {
            driver = new ChromeDriver(options);
        } catch (SessionNotCreatedException | IllegalStateException e) {
            log.warn("Could not start Chrome for portal login: {}", e.getMessage());
            return new Result("error", "Chrome could not be started on the server. Install Google Chrome or Chromium "
                    + "(or set app.portal-login.chrome-binary).", null, null, null, null, System.currentTimeMillis() - start);
        }
        long deadline = start + timeout * 1000L;
        try {
            try {
                driver.get(url);
            } catch (TimeoutException slow) {
                log.debug("Portal page {} still loading after the page-load timeout; continuing", url);
            }
            settle(driver, 2500);

            WebElement pw = visible(driver, By.cssSelector("input[type='password']"));
            WebElement user = usernameField(driver, pw);
            if (pw == null && user == null && clickLoginLink(driver)) {
                settle(driver, 2500);
                pw = visible(driver, By.cssSelector("input[type='password']"));
                user = usernameField(driver, pw);
            }
            if (pw == null && user == null) {
                return finish(driver, "no_login_form", "No sign-in form was found at this address. Check the portal URL in the payer's portal login.", start);
            }
            if (user != null) {
                user.clear();
                user.sendKeys(username);
            }
            if (pw == null) {
                // two-step sign-in: username first, password on the next screen
                submitFrom(driver, user);
                pw = waitVisible(driver, By.cssSelector("input[type='password']"), Math.min(12_000, deadline - System.currentTimeMillis()));
                if (pw == null) return classifyWithoutPassword(driver, user, start);
            }
            pw.clear();
            pw.sendKeys(password);
            String before = driver.getCurrentUrl();
            pw.sendKeys(Keys.ENTER);

            // wait until we leave the sign-in form or the page shows an error / MFA / CAPTCHA
            long until = Math.min(deadline, System.currentTimeMillis() + 15_000);
            while (System.currentTimeMillis() < until) {
                sleep(700);
                if (!driver.getCurrentUrl().equals(before) && visible(driver, By.cssSelector("input[type='password']")) == null) break;
                if (errorText(driver) != null || MFA.matcher(bodyText(driver)).find()) break;
            }
            settle(driver, 1500);
            return classify(driver, start);
        } catch (TimeoutException e) {
            return finish(driver, "error", "The portal took too long to respond", start);
        } catch (WebDriverException e) {
            log.warn("Portal login failed for {}: {}", url, e.getMessage());
            String m = e.getMessage() == null ? "" : e.getMessage().split("\n")[0];
            return finish(driver, "error", "The portal could not be opened: " + m, start);
        } finally {
            try {
                driver.quit();
            } catch (Exception ignored) {
                // browser already gone
            }
        }
    }

    // ---------- classification ----------

    private Result classify(WebDriver d, long start) {
        String text = bodyText(d);
        if (hasCaptcha(d, text)) return finish(d, "captcha", "The portal asked for a CAPTCHA (\"I'm not a robot\"). Finish signing in yourself.", start);
        boolean pwVisible = visible(d, By.cssSelector("input[type='password']")) != null;
        if (MFA.matcher(text).find() && !pwVisible) {
            return finish(d, "mfa_required", "The username and password were accepted, but the portal asks for a verification code (MFA). Finish signing in yourself.", start);
        }
        String err = errorText(d);
        if (pwVisible || err != null) {
            return finish(d, "login_failed", err != null ? "The portal rejected the sign-in: " + err
                    : "The portal is still showing the sign-in form — check the username and password.", start);
        }
        return finish(d, "logged_in", "Signed in to the portal.", start);
    }

    private Result classifyWithoutPassword(WebDriver d, WebElement user, long start) {
        String invalid = validationMessage(d, user);
        if (invalid != null) return finish(d, "login_failed", "The portal did not accept the username: " + invalid, start);
        String text = bodyText(d);
        if (hasCaptcha(d, text)) return finish(d, "captcha", "The portal asked for a CAPTCHA after the username. Finish signing in yourself.", start);
        if (MFA.matcher(text).find()) return finish(d, "mfa_required", "The portal asks for a verification code (MFA). Finish signing in yourself.", start);
        String err = errorText(d);
        if (err != null) return finish(d, "login_failed", "The portal rejected the username: " + err, start);
        return finish(d, "no_login_form", "After the username the portal did not show a password field (it may use single sign-on). Finish signing in yourself.", start);
    }

    private Result finish(WebDriver d, String outcome, String message, long start) {
        String url = null, title = null, shot = null, text = null;
        try {
            url = d.getCurrentUrl();
            title = d.getTitle();
            text = bodyText(d);
            if (text.length() > 600) text = text.substring(0, 600) + "…";
            if (d instanceof TakesScreenshot ts) shot = ts.getScreenshotAs(OutputType.BASE64);
        } catch (Exception e) {
            log.debug("Could not capture the portal page: {}", e.getMessage());
        }
        return new Result(outcome, message, url, title, shot, text, System.currentTimeMillis() - start);
    }

    // ---------- page helpers ----------

    private static WebElement visible(WebDriver d, By by) {
        for (WebElement e : d.findElements(by)) {
            try {
                if (e.isDisplayed() && e.isEnabled()) return e;
            } catch (WebDriverException ignored) {
                // element went stale
            }
        }
        return null;
    }

    private static WebElement waitVisible(WebDriver d, By by, long millis) {
        long until = System.currentTimeMillis() + Math.max(0, millis);
        do {
            WebElement e = visible(d, by);
            if (e != null) return e;
            sleep(400);
        } while (System.currentTimeMillis() < until);
        return null;
    }

    /** The visible text/email input that looks like a username — preferring one before the password field. */
    private static WebElement usernameField(WebDriver d, WebElement password) {
        List<WebElement> inputs = d.findElements(By.cssSelector("input[type='email'], input[type='text'], input:not([type])"));
        WebElement firstVisible = null;
        for (WebElement e : inputs) {
            try {
                if (!e.isDisplayed() || !e.isEnabled()) continue;
                if (password != null && isAfter(d, e, password)) continue;
                if (firstVisible == null) firstVisible = e;
                String hints = String.join(" ", attr(e, "name"), attr(e, "id"), attr(e, "autocomplete"), attr(e, "placeholder"), attr(e, "aria-label"), attr(e, "type"));
                if (USERNAME_HINT.matcher(hints).find()) return e;
            } catch (WebDriverException ignored) {
                // stale
            }
        }
        return firstVisible;
    }

    private static boolean isAfter(WebDriver d, WebElement a, WebElement b) {
        Object r = ((JavascriptExecutor) d).executeScript(
                "return !!(arguments[1].compareDocumentPosition(arguments[0]) & Node.DOCUMENT_POSITION_FOLLOWING);", a, b);
        return Boolean.TRUE.equals(r);
    }

    private static boolean clickLoginLink(WebDriver d) {
        for (WebElement e : d.findElements(By.cssSelector("a, button"))) {
            try {
                if (e.isDisplayed() && LOGIN_LINK.matcher(e.getText()).matches()) {
                    e.click();
                    return true;
                }
            } catch (WebDriverException ignored) {
                // stale or not clickable
            }
        }
        return false;
    }

    /** Submits the step that contains the username: its form's submit / "Next" button, else Enter. */
    private static void submitFrom(WebDriver d, WebElement user) {
        for (WebElement b : d.findElements(By.cssSelector("button, input[type='submit']"))) {
            try {
                String label = b.getText() + " " + attr(b, "value") + " " + attr(b, "aria-label");
                if (b.isDisplayed() && b.isEnabled() && NEXT_BUTTON.matcher(label).find()) {
                    b.click();
                    return;
                }
            } catch (WebDriverException ignored) {
                // stale
            }
        }
        user.sendKeys(Keys.ENTER);
    }

    /** The browser's own form-validation message for a field (e.g. "Please include an @ in the email address"). */
    private static String validationMessage(WebDriver d, WebElement field) {
        try {
            Object m = ((JavascriptExecutor) d).executeScript("return arguments[0].validationMessage || ''", field);
            String v = m == null ? "" : m.toString().trim();
            return v.isEmpty() ? null : v;
        } catch (WebDriverException e) {
            return null;
        }
    }

    private static String errorText(WebDriver d) {
        for (WebElement e : d.findElements(By.cssSelector("[role='alert'], .error, .alert-danger, .alert-error, .invalid-feedback, "
                + ".error-message, .errorMessage, [class*='error'], #flash.error, .flash.error"))) {
            try {
                if (!e.isDisplayed()) continue;
                String t = e.getText().trim().replaceAll("\\s+", " ");
                if (t.length() >= 4 && t.length() <= 300) return t;
            } catch (WebDriverException ignored) {
                // stale
            }
        }
        return null;
    }

    private static boolean hasCaptcha(WebDriver d, String text) {
        for (WebElement f : d.findElements(By.cssSelector("iframe"))) {
            try {
                if (CAPTCHA.matcher(attr(f, "src") + " " + attr(f, "title")).find()) return true;
            } catch (WebDriverException ignored) {
                // stale
            }
        }
        return text.toLowerCase(Locale.ROOT).contains("verify you are human") || text.toLowerCase(Locale.ROOT).contains("i'm not a robot");
    }

    private static String bodyText(WebDriver d) {
        try {
            Object t = ((JavascriptExecutor) d).executeScript("return document.body ? document.body.innerText : ''");
            return t == null ? "" : t.toString().replaceAll("\\s+", " ").trim();
        } catch (WebDriverException e) {
            return "";
        }
    }

    private static void settle(WebDriver d, long millis) {
        long until = System.currentTimeMillis() + 10_000;
        while (System.currentTimeMillis() < until) {
            try {
                if ("complete".equals(((JavascriptExecutor) d).executeScript("return document.readyState"))) break;
            } catch (WebDriverException ignored) {
                // navigating
            }
            sleep(300);
        }
        sleep(millis); // let client-side sign-in pages render
    }

    private static String attr(WebElement e, String name) {
        String v = e.getDomAttribute(name);
        return v == null ? "" : v;
    }

    private static void sleep(long ms) {
        try {
            Thread.sleep(ms);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    /** Only http(s); no localhost / private-network addresses unless allowed (the browser runs inside our network). */
    private static URI checkUrl(String url, boolean allowPrivate) {
        if (url == null || url.isBlank()) throw new BadRequestException("This payer has no portal address — add one in its portal login");
        URI uri;
        try {
            uri = URI.create(url.trim());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("The portal address is not a valid URL");
        }
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
        if (!scheme.equals("https") && !scheme.equals("http")) throw new BadRequestException("The portal address must start with https://");
        if (uri.getHost() == null) throw new BadRequestException("The portal address has no host name");
        if (!allowPrivate) {
            try {
                for (InetAddress a : InetAddress.getAllByName(uri.getHost())) {
                    if (a.isLoopbackAddress() || a.isSiteLocalAddress() || a.isLinkLocalAddress() || a.isAnyLocalAddress() || a.isMulticastAddress()) {
                        throw new BadRequestException("The portal address points to a private network address, which is not allowed");
                    }
                }
            } catch (UnknownHostException e) {
                throw new BadRequestException("The portal host name could not be found: " + uri.getHost());
            }
        }
        return uri;
    }
}
