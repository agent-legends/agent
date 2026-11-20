import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  metadataBase: new URL("https://agent.agentlegends.workers.dev"),
  title: "Agent Legends | AI Agent NFT Mint on BNB Smart Chain",
  description:
    "Recruit your Agent Legend on BNB Smart Chain. Strictly capped at 2,000 supply. 1 Free Mint for Binance SPACE ID Agent ID (.ai) holders; Paid mints at 0.0005 BNB.",
  icons: {
    icon: "/agent-legends-logo.jpg",
    shortcut: "/agent-legends-logo.jpg",
    apple: "/agent-legends-logo.jpg",
  },
  openGraph: {
    title: "Agent Legends | AI Agent NFT Mint on BNB Smart Chain",
    description: "2,000 Capped Supply. 1 Free Mint for SPACE ID Agent IDs (.ai). 0.0005 BNB Paid Mint.",
    images: ["/agent-legends-logo.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    site: "@agent_legends",
    creator: "@agent_legends",
    images: ["/agent-legends-logo.jpg"],
  },
  keywords: [
    "Agent Legends",
    "BNB Chain",
    "BNB Smart Chain",
    "Agentic Wallet",
    "SPACE ID",
    "Binance Agent ID",
    "NFT Minting",
    "AI Agents",
    "Web3 Identity",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <Providers>
          <Navbar />
          <main className="site-main flex-1 mx-auto">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
