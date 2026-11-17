import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Agent Legends | Free NFT Mint on BNB Chain",
  description:
    "Mint a free Agent Legends NFT on BNB Smart Chain. A separate $0.10 platform fee per NFT and network gas apply.",
  keywords: [
    "Agent Legends",
    "BNB Chain",
    "NFT Minting",
    "NFT Staking",
    "Spin to Earn",
    "USDT Rewards",
    "Web3 Gaming",
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
