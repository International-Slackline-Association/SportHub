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
    <html lang="en">
      <body>
        <Navigation />
          {children}
        <Footer />
      </body>
    </html>
  );
}
