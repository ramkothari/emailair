import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EmailAir",
  applicationName: "EmailAir",
  description: "Connect your Gmail account and manage your inbox with EmailAir.",
  openGraph: {
    title: "EmailAir",
    description: "Connect your Gmail account and manage your inbox with EmailAir.",
    siteName: "EmailAir",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "EmailAir",
    description: "Connect your Gmail account and manage your inbox with EmailAir.",
  },
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-[#EAEAEA] text-gray-900 antialiased dark:bg-[#18181B] dark:text-[#F5F5F5]">
        {children}
      </body>
    </html>
  );
}
