import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gageia Gestão — Dashboard Financeiro Inteligente",
  description: "Plataforma de inteligência financeira, DRE, EBITDA, Break-Even e BPO automatizado com integração Nibo API.",
};

import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <DashboardLayout>{children}</DashboardLayout>
      </body>
    </html>
  );
}
