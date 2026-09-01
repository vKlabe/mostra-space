import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/components/i18n/LanguageProvider";
import GuestSignupNudge from "@/components/public/GuestSignupNudge";
import { Cormorant_Garamond, Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://mostra.space"),

  title: {
    default: "MostraSpace | Digital Exhibition Platform",
    template: "%s | MostraSpace",
  },

  description:
    "MostraSpace is a digital exhibition platform for artists, galleries, curators and institutions. Create, publish and share immersive exhibitions directly from your browser.",

  applicationName: "MostraSpace",

  openGraph: {
    title: "MostraSpace | Digital Exhibition Platform",
    description:
      "Transform your artworks into a space people can visit.",
    url: "https://mostra.space",
    siteName: "MostraSpace",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "MostraSpace | Digital Exhibition Platform",
    description:
      "Transform your artworks into a space people can visit.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body
        className={`${inter.variable} ${cormorant.variable} bg-neutral-950 text-neutral-100 antialiased`}
      >
        <LanguageProvider>
          <GuestSignupNudge />
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
