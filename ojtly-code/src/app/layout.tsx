import './globals.css';
import { Inter } from 'next/font/google';
import type { Metadata, Viewport } from "next";

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'OJTly',
  description: 'OJTly Management App',
  manifest: '/manifest.json', 
  icons: {
    icon: '/icon.png', 
    apple: '/icon-192x192.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}