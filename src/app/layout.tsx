import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Cormorant_Garamond } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jet = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });
// Cormorant Garamond — Next Realm display typography. Loaded site-wide
// so .nr-display picks it up everywhere. Limited weights to keep payload tight.
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Next Realm OS · Internal Command Center",
  description: "Cinematic operator infrastructure for the Next Realm ecosystem. Sovereign operators · federated realms · one identity, one signal, one economy.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jet.variable} ${cormorant.variable} dark`} suppressHydrationWarning>
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
