import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Agent Legends 2.0 | NFT Minting, 72h Staking & Spin-to-Earn on BNB Chain",
  description:
    "Web3 platform in development for NFT minting, 72-hour staking, backend-randomized spins, and manually verified USDT payouts on BNB Smart Chain.",
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
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col bg-[#07090E] text-slate-100 selection:bg-[#00FF66] selection:text-[#07090E]">
        <Providers>
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
