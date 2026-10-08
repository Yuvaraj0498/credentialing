package com.zmartcredential.service;

import com.zmartcredential.dto.billing.BrBillingDtos.*;
import com.zmartcredential.common.PageResponse;
import com.zmartcredential.entity.*;
import com.zmartcredential.exception.BadRequestException;
import com.zmartcredential.exception.ConflictException;
import com.zmartcredential.exception.NotFoundException;
import com.zmartcredential.repository.*;
import com.zmartcredential.security.AuthContext;
import com.zmartcredential.security.Role;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Month;
import java.time.YearMonth;
import java.time.format.TextStyle;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BrBillingService {

    public static final Set<String> INVOICE_STATUSES = Set.of("draft", "due", "overdue", "paid", "void");
    public static final String VENDOR_NAME = "ZmartCredential, Inc.";
    public static final String VENDOR_ADDRESS = "123 Main St";
    public static final String VENDOR_CITY = "Houston";
    public static final String VENDOR_STATE = "TX";
    public static final String VENDOR_ZIP = "77001";
    public static final String DEFERRED_PAYMENT_MESSAGE =
            "Online card payments will be available in a later phase. Your invoice remains due.";

    private final AuthContext authContext;
    private final BrSupport support;
    private final BrPricingService pricingService;
    private final NotificationService notificationService;
    private final SubscriptionRepository subscriptionRepository;
    private final SubscriptionPackageRepository packageRepository;
    private final PackageFeatureRepository featureRepository;
    private final InvoiceRepository invoiceRepository;
    private final InvoiceLineRepository invoiceLineRepository;
    private final PaymentMethodRepository paymentMethodRepository;
    private final UsageCounterRepository usageCounterRepository;
    private final ProviderRepository providerRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final PayerRepository payerRepository;
    private final OrganizationRepository organizationRepository;
    private final LocationRepository locationRepository;

    private void requireRead() {
        authContext.requireRole(Role.PLATFORM_ADMIN, Role.ORG_ADMIN, Role.AUDITOR);
    }

    private void requireWrite() {
        authContext.requireRole(Role.PLATFORM_ADMIN, Role.ORG_ADMIN);
    }

    private static BigDecimal nz(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }

    private static BigDecimal money(BigDecimal v) {
        return nz(v).setScale(2, java.math.RoundingMode.HALF_UP);
    }

    // ---------------------------------------------------------------- packages & subscription

    public List<PackageDto> packages() {
        authContext.principal();
        Long orgId = authContext.principal().isProvider() ? null : authContext.orgIdOrNull();
        String current = orgId == null ? null
                : subscriptionRepository.findByOrgId(orgId).map(Subscription::getPackageCode).orElse(null);
        return packageRepository.findByActiveTrueOrderBySortOrderAsc().stream().map(p -> {
            List<PackageFeature> features = featureRepository.findByPackageCodeOrderBySortOrderAsc(p.getCode());
            return new PackageDto(p.getCode(), p.getName(), p.getBasePrice(), p.getPerProvider(), p.getColor(),
                    p.getColorSoft(), Boolean.TRUE.equals(p.getRecommended()), p.getProviderCap(), p.getPayerCap(),
                    p.getAiUploadsPerMonth(), p.getPrimarySupport(),
                    features.stream().filter(f -> !Boolean.FALSE.equals(f.getIncluded())).map(PackageFeature::getLabel).toList(),
                    features.stream().filter(f -> Boolean.FALSE.equals(f.getIncluded())).map(PackageFeature::getLabel).toList(),
                    p.getCode().equals(current));
        }).toList();
    }

    private long activeProviders(Long orgId) {
        return providerRepository.findByOrgId(orgId).stream().filter(p -> !"terminated".equals(p.getStatus())).count();
    }

    private SubscriptionDto subscriptionDto(Subscription s, long activeProviders) {
        SubscriptionPackage p = packageRepository.findById(s.getPackageCode()).orElse(null);
        int count = s.getProviderCount() == null ? 0 : s.getProviderCount();
        BigDecimal monthly = p == null ? BigDecimal.ZERO
                : nz(p.getBasePrice()).add(nz(p.getPerProvider()).multiply(BigDecimal.valueOf(count)));
        return new SubscriptionDto(s.getPackageCode(), p == null ? s.getPackageCode() : p.getName(),
                p == null ? null : p.getColor(), p == null ? null : p.getColorSoft(),
                p == null ? null : p.getBasePrice(), p == null ? null : p.getPerProvider(), count, money(monthly),
                s.getStatus(), s.getStartedAt(), s.getNextRenewalDate(), p == null ? null : p.getProviderCap(),
                p == null ? null : p.getPayerCap(), p == null ? null : p.getAiUploadsPerMonth(),
                p == null ? null : p.getPrimarySupport(), activeProviders);
    }

    public SubscriptionDto subscription() {
        requireRead();
        Long orgId = authContext.orgId();
        Subscription s = subscriptionRepository.findByOrgId(orgId)
                .orElseThrow(() -> new NotFoundException("This organization has no subscription yet"));
        return subscriptionDto(s, activeProviders(orgId));
    }

    @Transactional
    public SubscriptionDto updateSubscription(UpdateSubscriptionRequest req) {
        requireWrite();
        Long orgId = authContext.orgId();
        SubscriptionPackage pkg = packageRepository.findById(req.packageId())
                .filter(p -> !Boolean.FALSE.equals(p.getActive()))
                .orElseThrow(() -> new BadRequestException("Unknown plan '" + req.packageId() + "'"));
        long active = activeProviders(orgId);
        if (pkg.getProviderCap() != null) {
            if (req.providerCount() > pkg.getProviderCap()) {
                throw new ConflictException("The " + pkg.getName() + " plan supports up to " + pkg.getProviderCap()
                        + " providers. Choose a larger plan or fewer providers.");
            }
            if (active > pkg.getProviderCap()) {
                throw new ConflictException("You have " + active + " providers, but the " + pkg.getName()
                        + " plan supports up to " + pkg.getProviderCap() + ". Remove providers or choose a larger plan.");
            }
        }
        if (pkg.getPayerCap() != null) {
            long payers = enrollmentRepository.findByOrgId(orgId).stream().map(Enrollment::getPayerId).distinct().count();
            if (payers > pkg.getPayerCap()) {
                throw new ConflictException("You are enrolled with " + payers + " payers, but the " + pkg.getName()
                        + " plan supports up to " + pkg.getPayerCap() + ".");
            }
        }

        LocalDate today = BrSupport.today();
        Subscription s = subscriptionRepository.findByOrgId(orgId).orElse(null);
        String from = null;
        if (s == null) {
            s = new Subscription();
            s.setOrgId(orgId);
            s.setStatus("active");
            s.setStartedAt(LocalDateTime.now());
            s.setNextRenewalDate(today.plusMonths(1));
        } else {
            from = s.getPackageCode();
            if (!pkg.getCode().equals(from)) s.setStartedAt(LocalDateTime.now());
            if (s.getNextRenewalDate() == null || !s.getNextRenewalDate().isAfter(today)) {
                s.setNextRenewalDate(today.plusMonths(1));
            }
        }
        Integer fromCount = s.getProviderCount();
        s.setPackageCode(pkg.getCode());
        s.setProviderCount(req.providerCount());
        s = subscriptionRepository.save(s);

        String summary = (from == null ? "Subscribed to " + pkg.getName()
                : "Plan changed from " + from + " (" + fromCount + " providers) to " + pkg.getCode())
                + " with " + req.providerCount() + " providers";
        support.audit(orgId, "subscription", s.getId(), from == null ? "create" : "update", summary);
        SubscriptionDto dto = subscriptionDto(s, active);
        notificationService.notifyOrg(orgId, "Plan changed to " + pkg.getName(),
                req.providerCount() + " providers · $" + dto.monthlyTotal() + "/month from the next renewal on "
                        + s.getNextRenewalDate(), "CreditCard", NotificationService.ACCENT);
        return dto;
    }

    // ---------------------------------------------------------------- overview

    public Overview overview() {
        requireRead();
        Long orgId = authContext.orgId();
        LocalDate today = BrSupport.today();
        long active = activeProviders(orgId);
        Subscription sub = subscriptionRepository.findByOrgId(orgId).orElse(null);
        SubscriptionDto subDto = sub == null ? null : subscriptionDto(sub, active);

        UsageCounter.Key key = new UsageCounter.Key();
        key.setOrgId(orgId);
        key.setPeriod(YearMonth.from(today).toString());
        int uploads = usageCounterRepository.findById(key).map(UsageCounter::getAiUploads).orElse(0);

        List<Invoice> invoices = invoiceRepository.findByOrgIdOrderByInvoiceDateDesc(orgId).stream()
                .filter(i -> !"void".equals(i.getStatus())).toList();
        List<Invoice> unpaid = invoices.stream().filter(i -> !"paid".equals(i.getStatus())).toList();
        List<Invoice> paid = invoices.stream().filter(i -> "paid".equals(i.getStatus())).toList();
        BigDecimal paidThisYear = paid.stream().filter(i -> {
            LocalDate d = i.getPaidDate() != null ? i.getPaidDate() : i.getInvoiceDate();
            return d != null && d.getYear() == today.getYear();
        }).map(i -> nz(i.getTotal())).reduce(BigDecimal.ZERO, BigDecimal::add);

        List<MonthSpend> spend = new ArrayList<>();
        for (Month m : Month.values()) {
            BigDecimal amount = invoices.stream().filter(i -> i.getInvoiceDate() != null
                            && i.getInvoiceDate().getYear() == today.getYear() && i.getInvoiceDate().getMonth() == m)
                    .map(i -> nz(i.getTotal())).reduce(BigDecimal.ZERO, BigDecimal::add);
            spend.add(new MonthSpend(m.getValue(), m.getDisplayName(TextStyle.SHORT, Locale.US), money(amount)));
        }

        List<Invoice> recent = invoices.stream().limit(3).toList();
        Map<Long, Integer> lineCounts = lineCounts(recent);
        return new Overview(subDto,
                new Usage(uploads, subDto == null ? null : subDto.aiUploadsPerMonth()),
                new ProviderUsage(active, subDto == null ? null : subDto.providerCap()),
                new Outstanding(unpaid.size(), money(sum(unpaid))),
                money(paidThisYear), money(sum(invoices)), money(sum(paid)), invoices.size(), paid.size(),
                today.getYear(), spend,
                recent.stream().map(i -> summary(i, lineCounts.getOrDefault(i.getId(), 0))).toList());
    }

    private static BigDecimal sum(List<Invoice> list) {
        return list.stream().map(i -> nz(i.getTotal())).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    // ---------------------------------------------------------------- invoices

    private Map<Long, Integer> lineCounts(List<Invoice> invoices) {
        if (invoices.isEmpty()) return Map.of();
        return invoiceLineRepository.findByInvoiceIdIn(invoices.stream().map(Invoice::getId).toList()).stream()
                .collect(Collectors.groupingBy(InvoiceLine::getInvoiceId, Collectors.summingInt(l -> 1)));
    }

    private static InvoiceSummary summary(Invoice i, int lineCount) {
        return new InvoiceSummary(i.getId(), i.getNumber(), i.getInvoiceDate(), i.getDueDate(),
                BrSupport.effectiveStatus(i), i.getPaidDate(), i.getPaidMethodLabel(), money(i.getSubtotal()),
                money(i.getTax()), money(i.getTotal()), lineCount);
    }

    private List<Invoice> filteredInvoices(String status) {
        if (status != null && !status.isBlank() && !"all".equals(status) && !INVOICE_STATUSES.contains(status)) {
            throw new BadRequestException("status must be one of all, " + String.join(", ", new TreeSet<>(INVOICE_STATUSES)));
        }
        return invoiceRepository.findByOrgIdOrderByInvoiceDateDesc(authContext.orgId()).stream()
                .filter(i -> status == null || status.isBlank() || "all".equals(status)
                        || status.equals(BrSupport.effectiveStatus(i)))
                .toList();
    }

    public PageResponse<InvoiceSummary> invoices(String status, int page, int size) {
        requireRead();
        List<Invoice> list = filteredInvoices(status);
        Map<Long, Integer> counts = lineCounts(list);
        List<InvoiceSummary> rows = list.stream().map(i -> summary(i, counts.getOrDefault(i.getId(), 0))).toList();
        return PageResponse.ofList(rows, page, Math.min(Math.max(size, 1), 200));
    }

    public InvoiceDetail invoice(Long id) {
        requireRead();
        Long orgId = authContext.orgId();
        Invoice inv = invoiceRepository.findByIdAndOrgId(id, orgId).orElseThrow(() -> NotFoundException.of("Invoice", id));
        List<InvoiceLine> lines = invoiceLineRepository.findByInvoiceIdOrderBySortOrderAsc(id);
        Map<String, String> pkgNames = packageRepository.findAll().stream()
                .collect(Collectors.toMap(SubscriptionPackage::getCode, SubscriptionPackage::getName));
        Map<Long, Payer> payers = payerRepository.findAll().stream().collect(Collectors.toMap(Payer::getId, Function.identity()));
        Organization org = organizationRepository.findById(orgId).orElseThrow(() -> NotFoundException.of("Organization", orgId));
        Party from = new Party(VENDOR_NAME, VENDOR_ADDRESS, VENDOR_CITY, VENDOR_STATE, VENDOR_ZIP, null, null);
        Party billTo = new Party(org.getName(), org.getAddress(), org.getCity(), org.getState(), org.getZip(),
                org.getEmail(), org.getPhone());
        List<InvoiceLineDto> lineDtos = lines.stream().map(l -> {
            Payer payer = l.getPayerId() == null ? null : payers.get(l.getPayerId());
            return new InvoiceLineDto(l.getId(), l.getLineType(), l.getDescription(), l.getPackageCode(),
                    l.getPackageCode() == null ? null : pkgNames.getOrDefault(l.getPackageCode(), l.getPackageCode()),
                    l.getBasePrice(), l.getPerProvider(), l.getProviderCount(), l.getPeriodStart(), l.getPeriodEnd(),
                    l.getProviderId(), l.getProviderName(), l.getPayerId(),
                    l.getPayerName() != null ? l.getPayerName() : payer == null ? null : payer.getName(),
                    payer == null ? null : payer.getPricingCategory(), l.getStateCode(), l.getServiceType(),
                    money(l.getAmount()));
        }).toList();
        return new InvoiceDetail(summary(inv, lines.size()), inv.getPaymentMethodId(), from, billTo, lineDtos);
    }

    public ResponseEntity<byte[]> invoicesCsv(String status) {
        requireRead();
        List<List<Object>> rows = filteredInvoices(status).stream().map(i -> List.<Object>of(
                i.getNumber(), String.valueOf(i.getInvoiceDate()), String.valueOf(i.getDueDate()),
                BrSupport.effectiveStatus(i), money(i.getTotal()),
                i.getPaidDate() == null ? "" : i.getPaidDate().toString())).toList();
        return BrSupport.csv("invoices-" + BrSupport.today() + ".csv",
                List.of("Invoice #", "Date", "Due Date", "Status", "Amount", "Paid Date"), rows);
    }

    /** Card payments are deferred to the Stripe phase: validates the request and changes nothing. */
    public DeferredResponse pay(Long id, PayInvoiceRequest req) {
        requireWrite();
        Long orgId = authContext.orgId();
        Invoice inv = invoiceRepository.findByIdAndOrgId(id, orgId).orElseThrow(() -> NotFoundException.of("Invoice", id));
        if ("paid".equals(inv.getStatus())) throw new ConflictException("Invoice " + inv.getNumber() + " is already paid");
        if ("void".equals(inv.getStatus())) throw new ConflictException("Invoice " + inv.getNumber() + " is void");
        if (req != null && req.paymentMethodId() != null) {
            paymentMethodRepository.findByIdAndOrgId(req.paymentMethodId(), orgId)
                    .orElseThrow(() -> NotFoundException.of("Payment method", req.paymentMethodId()));
        }
        return new DeferredResponse("deferred", DEFERRED_PAYMENT_MESSAGE, inv.getId(), BrSupport.effectiveStatus(inv));
    }

    /** Platform admin manual reconciliation (any org). */
    @Transactional
    public InvoiceSummary markPaid(Long id, MarkPaidRequest req) {
        authContext.requireRole(Role.PLATFORM_ADMIN);
        Invoice inv = invoiceRepository.findById(id).orElseThrow(() -> NotFoundException.of("Invoice", id));
        if ("paid".equals(inv.getStatus())) throw new ConflictException("Invoice " + inv.getNumber() + " is already paid");
        if ("void".equals(inv.getStatus())) throw new ConflictException("Invoice " + inv.getNumber() + " is void");
        PaymentMethod pm = null;
        if (req != null && req.paymentMethodId() != null) {
            pm = paymentMethodRepository.findByIdAndOrgId(req.paymentMethodId(), inv.getOrgId())
                    .orElseThrow(() -> NotFoundException.of("Payment method", req.paymentMethodId()));
        } else {
            pm = paymentMethodRepository.findByOrgId(inv.getOrgId()).stream()
                    .filter(m -> Boolean.TRUE.equals(m.getDefaultMethod())).findFirst().orElse(null);
        }
        LocalDate paidDate = req != null && req.paidDate() != null ? req.paidDate() : BrSupport.today();
        inv.setStatus("paid");
        inv.setPaidDate(paidDate);
        inv.setPaymentMethodId(pm == null ? null : pm.getId());
        inv.setPaidMethodLabel(pm == null ? "Manual payment" : pm.getBrand() + " •••• " + pm.getLast4());
        invoiceRepository.save(inv);
        support.audit(inv.getOrgId(), "invoice", inv.getId(), "mark_paid",
                "Invoice " + inv.getNumber() + " marked paid on " + paidDate + " (" + inv.getPaidMethodLabel() + ")");
        notificationService.notifyOrg(inv.getOrgId(), "Invoice " + inv.getNumber() + " paid",
                "Payment of $" + money(inv.getTotal()) + " recorded", "CheckCircle2", NotificationService.SUCCESS);
        return summary(inv, invoiceLineRepository.findByInvoiceIdOrderBySortOrderAsc(id).size());
    }

    // ---------------------------------------------------------------- payment methods

    private static boolean isExpired(String exp) {
        if (exp == null || !exp.matches("\\d{2}/\\d{2}")) return false;
        int month = Integer.parseInt(exp.substring(0, 2));
        int year = 2000 + Integer.parseInt(exp.substring(3));
        return YearMonth.of(year, Math.min(Math.max(month, 1), 12)).isBefore(YearMonth.from(BrSupport.today()));
    }

    private static PaymentMethodDto pmDto(PaymentMethod m) {
        return new PaymentMethodDto(m.getId(), m.getBrand(), m.getLast4(), m.getExp(), m.getBillingName(),
                m.getBillingZip(), Boolean.TRUE.equals(m.getDefaultMethod()), isExpired(m.getExp()), m.getCreatedAt());
    }

    private List<PaymentMethod> methods(Long orgId) {
        return paymentMethodRepository.findByOrgIdOrderByCreatedAtAsc(orgId);
    }

    public List<PaymentMethodDto> paymentMethods() {
        requireRead();
        return methods(authContext.orgId()).stream()
                .sorted(Comparator.comparing((PaymentMethod m) -> !Boolean.TRUE.equals(m.getDefaultMethod())))
                .map(BrBillingService::pmDto).toList();
    }

    @Transactional
    public PaymentMethodDto addPaymentMethod(AddPaymentMethodRequest req) {
        requireWrite();
        Long orgId = authContext.orgId();
        if (isExpired(req.exp())) throw new BadRequestException("Card is expired");
        boolean first = methods(orgId).isEmpty();
        PaymentMethod m = new PaymentMethod();
        m.setOrgId(orgId);
        m.setBrand(req.brand());
        m.setLast4(req.last4());
        m.setExp(req.exp());
        m.setBillingName(req.billingName().trim());
        m.setBillingZip(req.billingZip());
        m.setDefaultMethod(first);
        m = paymentMethodRepository.save(m);
        support.audit(orgId, "payment_method", m.getId(), "create", "Card added: " + m.getBrand() + " ending in " + m.getLast4());
        return pmDto(m);
    }

    @Transactional
    public List<PaymentMethodDto> setDefault(Long id) {
        requireWrite();
        Long orgId = authContext.orgId();
        PaymentMethod target = paymentMethodRepository.findByIdAndOrgId(id, orgId)
                .orElseThrow(() -> NotFoundException.of("Payment method", id));
        List<PaymentMethod> all = methods(orgId);
        all.forEach(m -> m.setDefaultMethod(m.getId().equals(target.getId())));
        paymentMethodRepository.saveAll(all);
        support.audit(orgId, "payment_method", id, "update", "Default payment method set to " + target.getBrand() + " •••• " + target.getLast4());
        return paymentMethods();
    }

    @Transactional
    public void deletePaymentMethod(Long id) {
        requireWrite();
        Long orgId = authContext.orgId();
        PaymentMethod target = paymentMethodRepository.findByIdAndOrgId(id, orgId)
                .orElseThrow(() -> NotFoundException.of("Payment method", id));
        List<PaymentMethod> all = methods(orgId);
        boolean isDefault = Boolean.TRUE.equals(target.getDefaultMethod());
        long openInvoices = invoiceRepository.countByOrgIdAndStatusNotIn(orgId, BrSupport.CLOSED_INVOICE);
        if (openInvoices > 0 && (all.size() == 1 || isDefault)) {
            throw new ConflictException(all.size() == 1
                    ? "You can't remove your only payment method while invoices are due. Add another card first."
                    : "You can't remove the default payment method while invoices are due. Set another card as default first.");
        }
        paymentMethodRepository.delete(target);
        if (isDefault) {
            all.stream().filter(m -> !m.getId().equals(id)).findFirst().ifPresent(m -> {
                m.setDefaultMethod(true);
                paymentMethodRepository.save(m);
            });
        }
        support.audit(orgId, "payment_method", id, "delete", "Payment method removed: " + target.getBrand() + " •••• " + target.getLast4());
    }

    // ---------------------------------------------------------------- provider billing widget

    public ProviderBilling providerBilling(Long providerId) {
        authContext.requireRole(Role.PLATFORM_ADMIN, Role.ORG_ADMIN, Role.AUDITOR, Role.CLERK);
        Long orgId = authContext.orgId();
        Provider provider = providerRepository.findByIdAndOrgId(providerId, orgId)
                .orElseThrow(() -> NotFoundException.of("Provider", providerId));
        Map<Long, Payer> payers = payerRepository.findAll().stream().collect(Collectors.toMap(Payer::getId, Function.identity()));

        List<InvoiceLine> lines = invoiceLineRepository.findByProviderId(providerId).stream()
                .filter(l -> "service".equals(l.getLineType())).toList();
        Map<Long, Invoice> invoices = invoiceRepository.findAllById(lines.stream().map(InvoiceLine::getInvoiceId).distinct().toList())
                .stream().filter(i -> orgId.equals(i.getOrgId()) && !"void".equals(i.getStatus()))
                .collect(Collectors.toMap(Invoice::getId, Function.identity()));
        List<ProviderServiceLine> services = new ArrayList<>();
        BigDecimal billed = BigDecimal.ZERO, paid = BigDecimal.ZERO;
        Set<String> billedKeys = new HashSet<>();
        for (InvoiceLine l : lines) {
            Invoice inv = invoices.get(l.getInvoiceId());
            if (inv == null) continue;
            Payer payer = l.getPayerId() == null ? null : payers.get(l.getPayerId());
            BigDecimal amount = money(l.getAmount());
            services.add(new ProviderServiceLine(l.getId(), inv.getId(), inv.getNumber(), inv.getInvoiceDate(),
                    BrSupport.effectiveStatus(inv), l.getPayerId(),
                    l.getPayerName() != null ? l.getPayerName() : payer == null ? null : payer.getName(),
                    payer == null ? null : payer.getPricingCategory(), l.getStateCode(), l.getServiceType(), amount));
            billed = billed.add(amount);
            if ("paid".equals(inv.getStatus())) paid = paid.add(amount);
            billedKeys.add(l.getPayerId() + ":" + l.getServiceType());
        }
        services.sort(Comparator.comparing(ProviderServiceLine::date, Comparator.nullsLast(Comparator.reverseOrder())));

        String state = provider.getLicenseState();
        if ((state == null || state.isBlank()) && provider.getLocationId() != null) {
            state = locationRepository.findByIdAndOrgId(provider.getLocationId(), orgId).map(Location::getState).orElse(null);
        }
        if (state == null || state.isBlank()) state = BrPricingService.FALLBACK_STATE;

        BrPricingService.Tables tables = pricingService.tables();
        List<EstimatedService> estimated = new ArrayList<>();
        BigDecimal upcoming = BigDecimal.ZERO;
        for (Enrollment e : enrollmentRepository.findByOrgIdAndProviderId(orgId, providerId)) {
            if ("terminated".equals(e.getStatus())) continue;
            String type = "recred".equals(e.getApplicationType()) ? "recred" : "new";
            if (billedKeys.contains(e.getPayerId() + ":" + type)) continue;
            Payer payer = payers.get(e.getPayerId());
            BigDecimal amount = tables.price(state, payer, type);
            estimated.add(new EstimatedService(e.getId(), e.getPayerId(), payer == null ? null : payer.getName(),
                    payer == null ? null : payer.getColor(), payer == null ? null : payer.getPricingCategory(),
                    e.getStatus(), e.getSubmittedDate(), type, amount));
            upcoming = upcoming.add(amount);
        }
        return new ProviderBilling(providerId, state.toUpperCase(Locale.ROOT), services, money(billed), money(paid),
                money(billed.subtract(paid)), estimated, money(upcoming));
    }
}
