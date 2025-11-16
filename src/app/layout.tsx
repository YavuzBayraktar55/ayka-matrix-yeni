import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LoadingProvider } from "@/contexts/LoadingContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ayka Matrix - Personel Yönetim Sistemi",
  description: "Ayka Enerji personel ve operasyon yönetim platformu",
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        {/* Konsol filtrelerini en başta yükle */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined' && '${process.env.NODE_ENV}' === 'development') {
                const originalWarn = console.warn;
                const originalLog = console.log;
                
                console.warn = function(...args) {
                  const msg = String(args[0] || '');
                  if (msg.includes('Download the React DevTools') || 
                      msg.includes('Skipping auto-scroll') || 
                      msg.includes('position: sticky') ||
                      msg.includes('position: fixed')) {
                    return;
                  }
                  originalWarn.apply(console, args);
                };
                
                console.log = function(...args) {
                  const msg = String(args[0] || '');
                  if (msg.includes('[Fast Refresh]') || 
                      msg.includes('Skipping auto-scroll')) {
                    return;
                  }
                  originalLog.apply(console, args);
                };
              }
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <LoadingProvider>
            <AuthProvider>
              {children}
            </AuthProvider>
          </LoadingProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
