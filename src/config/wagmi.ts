import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { bsc, bscTestnet, hardhat } from "wagmi/chains";
import { http } from "wagmi";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "3a8170812b534d0ff9d794f19a901d64";

export const wagmiConfig = getDefaultConfig({
  appName: "Agent Legends 2.0",
  projectId,
  chains: [bscTestnet, bsc, hardhat],
  transports: {
    [bscTestnet.id]: http("https://data-seed-prebsc-1-s1.binance.org:8545/"),
    [bsc.id]: http("https://bsc-dataseed.binance.org/"),
    [hardhat.id]: http("http://127.0.0.1:8545"),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
