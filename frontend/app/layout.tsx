import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Menggunakan font Inter sebagai pengganti Geist yang aman untuk Next.js 14
const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Smart Attendance System",
  description: "Sistem absensi otomatis berbasis computer vision",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className="h-full antialiased"
    >
      <body className={`${inter.className} min-h-full flex flex-col`}>
        {children}
      </body>
    </html>
  );
}