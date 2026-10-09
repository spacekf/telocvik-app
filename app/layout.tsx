import type { Metadata, Viewport } from "next";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tělocvik – PrimMat | Evidence výsledků z TV",
  description:
    "Školní systém PrimMat pro evidenci výsledků z tělesné výchovy, docházky, bodů a známek.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/brand/logo-primmat.webp",
  },
};

export const viewport: Viewport = {
  themeColor: "#17143A",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="cs">
      <body className="min-h-screen bg-background antialiased">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
