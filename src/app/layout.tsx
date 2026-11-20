import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  metadataBase: new URL("https://agent.agentlegends.workers.dev"),
  title: "$LEGENDS Mint & Share Terminal · BNB Smart Chain",
  description:
    "Mint $LEGENDS shares on the bonding curve and recruit Agent Legends NFTs with your .ai Agent ID on BNB Smart Chain.",
  icons: {
    icon: "/agent-legends-logo.jpg",
    shortcut: "/agent-legends-logo.jpg",
    apple: "/agent-legends-logo.jpg",
  },
  openGraph: {
    title: "$LEGENDS Mint & Share Terminal · BNB Smart Chain",
    description: "Bonding curve shares, PancakeSwap LP launch, and 2,000 capped NFT recruitment on BSC.",
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
    "LEGENDS",
    "BNB Chain",
    "BNB Smart Chain",
    "Agentic Wallet",
    "SPACE ID",
    "Binance Agent ID",
    "NFT Minting",
    "Bonding Curve",
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
      <head>
        <link rel="alternate" type="text/plain" href="https://agent.agentlegends.workers.dev/llms.txt" />
        <link rel="alternate" type="text/markdown" href="https://agent.agentlegends.workers.dev/skill.md" />
      </head>
      <body className="min-h-screen flex flex-col bg-[#070a12] text-white">
        <Providers>
          <Navbar />
          <main className="site-main flex-1 mx-auto w-full">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
