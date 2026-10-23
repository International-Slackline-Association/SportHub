import type { Metadata } from "next";
import "@ui/globals.css";
import Footer from "@ui/Footer";
import Navigation from "@ui/Navigation"
import SessionProvider from "./SessionProvider"
import ReactQueryProvider from "./ReactQueryProvider";

export const metadata: Metadata = {
  title: "SportHub",
  description: "ISA Slackline Sport Hub",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {  
  const isDevMode = process.env.DEV === "TRUE" || process.env.NODE_ENV === "development";
  const isLocalDb = process.env.DYNAMODB_LOCAL?.toLowerCase() === "true";
  const isEnvMisaligned = isDevMode && process.env.DB_REGION === "eu-central-1";

  return (
    <html lang="en" className="h-full">
      <body className="min-h-screen flex flex-col" suppressHydrationWarning>
        <ReactQueryProvider>
          <SessionProvider>
            {isDevMode && (
              <div className="bg-yellow-100 text-yellow-800 p-2 text-sm sticky top-0 z-50">
                <strong>Non-Production Environment:</strong> Developer data in use and should not be
                used as official results. Some features may not be fully functional. 
                Data source: {isLocalDb ? "local DB" : process.env.DB_REGION}.
              </div>
            )}
            {!isLocalDb && isEnvMisaligned && (
              <div className="bg-red-100 text-red-800 p-2 text-lg sticky top-0 z-50">
                <strong>Environment Mismatch:</strong> You may be using live production data inside
                a test environment!!! Please do not make any changes and confirm with the team.<br/>
                DB Region={process.env.DB_REGION}; AWS Region={process.env.AWS_REGION}; DEV={process.env.DEV}; NODE_ENV={process.env.NODE_ENV};
              </div>
            )}
            <Navigation />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </SessionProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
