import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Haylio — One smart link. Zero spam on your phone.",
  description:
    "Give your business a public contact link with AI chat, messages, voice notes and callbacks — without ever exposing your personal mobile number.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@400..800&family=Poppins:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
