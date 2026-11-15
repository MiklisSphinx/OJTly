
import { Inter } from 'next/font/google';
import type { Metadata, Viewport } from "next";
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

// 1. Metadata handles the manifest and icons properly
export const metadata: Metadata = {
  title: "OJTly",
  manifest: "/manifest.json",
  icons: {
    icon: "/ojt-logo.png", // Update this line
    apple: "/ojt-logo.png",
  },
};

// 2. Viewport is handled separately in Next.js 14/15
export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
};
import InstallButton from '@/components/InstallButton'; // Adjust path as needed

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
       {children}
        <InstallButton /> {/* Place here so it floats over everything */}
        
      </body>
    </html>
  );
}