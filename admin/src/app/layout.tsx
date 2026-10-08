import type { Metadata } from "next";
import { Inter, DM_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/AppProviders";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-inter" });
const dmSans = DM_Sans({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--font-dm-sans" });

export const metadata: Metadata = {
  title: "ZmartCredential — Provider Credentialing Platform",
  description: "Provider credentialing, automated.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${dmSans.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
