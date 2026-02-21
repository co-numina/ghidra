import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "$GHIDRA — Hosted Decompilation Service",
  description: "Token-gated access to binary analysis powered by NSA's Ghidra reverse engineering framework. Pay per decompilation session.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "$GHIDRA — Hosted Decompilation Service",
    description: "Token-gated binary analysis powered by NSA's Ghidra. Pay per decompilation session.",
    images: [{ url: "/og.svg", width: 2400, height: 960 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "$GHIDRA",
    images: ["/og.svg"],
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
