import type { Metadata } from "next";
import Link from "next/link";
import { Inter, Roboto_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const mono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Product Ratings Snapshot",
  description: "Upload brands, crawl PDPs, compute ratings, and export results.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${mono.variable} antialiased`}>
        <header className="sticky top-0 z-30 backdrop-blur border-b bg-[rgba(10,10,10,0.6)] text-[var(--foreground)]">
          <div className="max-w-7xl mx-auto flex items-center gap-4 px-4 py-3">
            <div className="font-semibold tracking-wide">
              <span className="text-[var(--accent)]">◆</span> Product Ratings Snapshot
            </div>
            <nav className="flex items-center gap-3 text-sm">
              <Link className="hover:text-[var(--accent)] transition-colors" href="/">Home</Link>
              <Link className="hover:text-[var(--accent)] transition-colors" href="/upload">Upload</Link>
              <Link className="hover:text-[var(--accent)] transition-colors" href="/run">Run</Link>
              <Link className="hover:text-[var(--accent)] transition-colors" href="/results">Results</Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
