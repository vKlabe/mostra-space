import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/components/i18n/LanguageProvider";
import GuestSignupNudge from "@/components/public/GuestSignupNudge";
import GoogleAccountCompletionGate from "@/components/auth/GoogleAccountCompletionGate";
import ServiceWorkerRegistration from "@/components/pwa/ServiceWorkerRegistration";
import PwaInstallProvider from "@/components/pwa/PwaInstallProvider";
import PwaGlobalInstallPrompt from "@/components/pwa/PwaGlobalInstallPrompt";
import PwaBadgeSync from "@/components/pwa/PwaBadgeSync";
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
    default: "Mostra.Space — L’arte senza confini",
    template: "%s | Mostra.Space",
  },
  description:
    "La piattaforma espositiva digitale per artisti, curatori, gallerie, collezionisti e amanti dell’arte.",
  applicationName: "Mostra.Space",
  openGraph: {
    type: "website",
    locale: "it_IT",
    siteName: "Mostra.Space",
    title: "Mostra.Space — L’arte senza confini",
    description:
      "La piattaforma espositiva digitale per artisti, curatori, gallerie, collezionisti e amanti dell’arte.",
    images: [
      {
        url: "/home/hero-gallery.jpg",
        alt: "Mostra.Space — L’arte senza confini",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mostra.Space — L’arte senza confini",
    description:
      "La piattaforma espositiva digitale per artisti, curatori, gallerie, collezionisti e amanti dell’arte.",
    images: ["/home/hero-gallery.jpg"],
  },
  appleWebApp: {
    capable: true,
    title: "Mostra.Space",
    statusBarStyle: "black-translucent",
  },
  icons: {
    apple: [
      {
        url: "/pwa/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
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
        <ServiceWorkerRegistration />
        <PwaBadgeSync />
        <LanguageProvider>
          <PwaInstallProvider>
            <PwaGlobalInstallPrompt />
            <GuestSignupNudge />
            <GoogleAccountCompletionGate />
            {children}
          </PwaInstallProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
