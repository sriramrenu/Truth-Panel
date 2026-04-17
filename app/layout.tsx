import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Poppins , Inter } from 'next/font/google';
import "./globals.css";

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500'], // Specify the weights you need
  variable: '--font-poppins', // Optional: for Tailwind or CSS variables
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '300'], // Specify the weights you need
  variable: '--font-inter', // Optional: for Tailwind or CSS variables
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
  title: "Truth Panel",
  description: "Connecting the dots",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${poppins.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
