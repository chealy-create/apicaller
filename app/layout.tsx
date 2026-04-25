import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "API Explorer",
  description: "Financial API explorer for multiple data platforms",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col bg-white text-foreground">
        {children}
      </body>
    </html>
  );
}
