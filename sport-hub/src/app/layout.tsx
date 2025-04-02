import type { Metadata } from "next";
import "@/ui/globals.css";
import Footer from "@/ui/Footer";
import Navbar from "@/ui/Navigation"
import { Open_Sans } from "next/font/google"

export const metadata: Metadata = {
  title: "SportHub",
  description: "ISA Slackline Sport Hub",
};

const open_sans_font = Open_Sans({
  subsets: ['latin'],
  style: ['normal'],
  variable: '--font-open-sans'
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={open_sans_font.variable}>
      <body className="font-main">
        <Navbar />
        <div className="main-content">
          {children}
        </div>
        <Footer />
      </body>
    </html>
  );
}
