import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StoreMe — Private Media Storage",
  description: "Store your photos and videos privately on GitHub. No servers, no third-party access — your files, your repository.",
  keywords: ["media storage", "private cloud", "github storage", "photo backup"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="bg-glow bg-glow-1 animate-pulse-glow" />
        <div className="bg-glow bg-glow-2 animate-pulse-glow" />
        {children}
      </body>
    </html>
  );
}
