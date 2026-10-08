"use client";



export function Avatar({ name, size = 32, color }: { name?: string | null; size?: number; color?: string }) {
  const initials = (name || "?").split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div
      style={{ width: size, height: size, background: color || "#fed7aa", color: "#c2410c", fontSize: size * 0.4, fontWeight: 600 }}
      className="rounded-full flex items-center justify-center flex-shrink-0"
    >
      {initials}
    </div>
  );
}
