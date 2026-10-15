import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import { SiteFooter, SiteHeader } from "@/components/chrome";
import { ServiceBanner } from "@/components/ui";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: "Las Trampas Pool", template: "%s · Las Trampas Pool" },
  description:
    "The member platform for Las Trampas Pool in Burton Valley, Lafayette. One login for dues, lap swim, events, and the summer schedule.",
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body>
        <a className="skip" href="#main">
          Skip to content
        </a>
        <ServiceBanner />
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
