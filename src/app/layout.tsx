import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jet = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  title: "NROS · Federation Kernel for the Next Realm Civilization",
  description: "Federation infrastructure for sovereign operator realms. Universal identity · shared XP · transmissions feed · governance APIs. Not a website — the wiring underneath.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jet.variable} dark`} suppressHydrationWarning>
      <body className="min-h-screen">
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            classNames: {
              toast: "nros-deck !bg-card/90 !text-foreground",
            },
          }}
        />
      </body>
    </html>
  );
}
