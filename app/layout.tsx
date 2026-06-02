import type { Metadata } from "next";
import {Inter} from "next/font/google";
import "./globals.css";
import React from "react";

const display = Inter({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600"],
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"]
});

export const metadata: Metadata = {
  title: "Streamline",
  description: "A streaming chat interface",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${display.variable} ${body.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
