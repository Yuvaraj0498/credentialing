"use client";

/** The payer's image when the super admin added one, otherwise the first letters of its name on its color. */
export function PayerLogo({ name, color, logo, size = 48 }: { name: string; color?: string | null; logo?: string | null; size?: number }) {
  if (logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logo} alt={name} className="rounded-lg object-contain bg-paper border border-line flex-shrink-0" style={{ width: size, height: size }} />
    );
  }
  return (
    <div className="rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{ width: size, height: size, background: color || "#64748b" }}>
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}
