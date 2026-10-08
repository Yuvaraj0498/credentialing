// Printable-HTML "PDF" export, ported from the prototype's exportPDF helper.
// The window must be opened synchronously inside the click handler (popup blockers),
// so callers use openPrintWindow() first and writePrintWindow() once their data is ready.

const CSS =
  "body { font-family: -apple-system, sans-serif; padding: 32px; color: #0f172a; }" +
  " h1 { font-size: 24px; margin-bottom: 8px; }" +
  " table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }" +
  " th, td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: left; }" +
  " th { background: #f8f9fb; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; }" +
  " .pill { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 500; }" +
  " .pill-success { background: #ecfdf5; color: #059669; }" +
  " .pill-warn { background: #fefce8; color: #a16207; }" +
  " .pill-danger { background: #fef2f2; color: #b91c1c; }" +
  " .pill-info { background: #eff6ff; color: #1d4ed8; }" +
  " @media print { body { padding: 0; } }";

/** HTML-escapes a value for the printable document. */
export function esc(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

export function openPrintWindow(): Window | null {
  return window.open("", "_blank");
}

export function writePrintWindow(win: Window, title: string, contentHtml: string) {
  const closeScript = "<" + "/script>";
  const html =
    "<!doctype html><html><head><title>" + esc(title) + "</title><style>" + CSS + "</style></head><body>" +
    contentHtml +
    "<script>setTimeout(function(){window.print();}, 300);" + closeScript +
    "</body></html>";
  win.document.open();
  win.document.write(html);
  win.document.close();
}

/** One-shot export when the HTML is already available. Returns false if the popup was blocked. */
export function exportPDF(title: string, contentHtml: string): boolean {
  const win = openPrintWindow();
  if (!win) return false;
  writePrintWindow(win, title, contentHtml);
  return true;
}
