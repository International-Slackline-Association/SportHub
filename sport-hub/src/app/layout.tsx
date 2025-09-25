import type { Metadata } from "next";
import "@ui/globals.css";
import Footer from "@ui/Footer";
import Navigation from "@ui/Navigation"

export const metadata: Metadata = {
  title: "SportHub",
  description: "ISA Slackline Sport Hub",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-screen flex flex-col">
        <Navigation />
          <main className="flex-1">
            {children}
          </main>
        <Footer />
      </body>
    </html>
  );
}
