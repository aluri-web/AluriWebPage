import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";


const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "900"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Aluri - Créditos e Inversiones Inmobiliarias",
  description: "Plataforma de financiamiento inmobiliario que conecta propietarios e inversionistas",
  keywords: ["créditos", "inversiones", "inmobiliaria", "propiedades", "financiamiento"],
  icons: {
    icon: '/faviconV2.png',
    apple: '/faviconV2.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="light">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body suppressHydrationWarning className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
