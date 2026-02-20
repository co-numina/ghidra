import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "$GHIDRA — Hosted Decompilation Service",
  description: "Token-gated access to binary analysis powered by NSA's Ghidra reverse engineering framework. Pay per decompilation session.",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
