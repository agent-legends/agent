import hre from "hardhat";
const { ethers, network } = hre;
import fs from "fs";
import path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  const chainId = (await ethers.provider.getNetwork()).chainId;

  console.log("==================================================");
  console.log("🚀 Deploying Agent Legends 2.0 Smart Contracts");
  console.log(`🌐 Network: ${network.name} (Chain ID: ${chainId})`);
  console.log(`👤 Deployer Account: ${deployer.address}`);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Deployer Balance: ${ethers.formatEther(balance)} BNB`);
  console.log("==================================================");

  let priceFeedAddress = "";
  let usdtAddress = "";

  if (Number(chainId) === 56) {
    // BSC Mainnet
    priceFeedAddress = "0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE";
    usdtAddress = "0x55d398326f99059fF775485246999027B3197955";
  } else if (Number(chainId) === 97) {
    // BSC Testnet
    priceFeedAddress = "0x2514895c78B50853799fB792454453076C104B06";
    usdtAddress = "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd";
  } else {
    // Localhost / Hardhat Network
    console.log("Deploying Mock Chainlink BNB/USD Aggregator...");
    const MockFeedFactory = await ethers.getContractFactory("MockPriceFeed");
    const mockFeed = await MockFeedFactory.deploy(8, 60000000000n); // $600 BNB price
    await mockFeed.waitForDeployment();
    priceFeedAddress = await mockFeed.getAddress();
    console.log(`✅ Mock Price Feed Deployed: ${priceFeedAddress}`);

    console.log("Deploying Mock USDT Token...");
    const MockUsdtFactory = await ethers.getContractFactory("MockUSDT");
    const mockUsdt = await MockUsdtFactory.deploy();
    await mockUsdt.waitForDeployment();
    usdtAddress = await mockUsdt.getAddress();
    console.log(`✅ Mock USDT Deployed: ${usdtAddress}`);
  }

  // 1. Deploy AgentLegendsNFT
  const initialBaseURI = "ipfs://bafybeidczpaz457x54jlwv2m3v3iugn56t4j65e5u7pwy5lq77kwe3q42a/";
  console.log("Deploying AgentLegendsNFT...");
  const NFTFactory = await ethers.getContractFactory("AgentLegendsNFT");
  const nft = await NFTFactory.deploy(deployer.address, priceFeedAddress, initialBaseURI);
  await nft.waitForDeployment();
  const nftAddress = await nft.getAddress();
  console.log(`✅ AgentLegendsNFT Deployed to: ${nftAddress}`);

  // 2. Deploy AgentLegendsStaking
  console.log("Deploying AgentLegendsStaking (72h Lock Vault)...");
  const StakingFactory = await ethers.getContractFactory("AgentLegendsStaking");
  const staking = await StakingFactory.deploy(deployer.address, nftAddress);
  await staking.waitForDeployment();
  const stakingAddress = await staking.getAddress();
  console.log(`✅ AgentLegendsStaking Deployed to: ${stakingAddress}`);

  // Save deployment metadata
  const deploymentInfo = {
    network: network.name,
    chainId: chainId.toString(),
    nftContract: nftAddress,
    stakingContract: stakingAddress,
    priceFeed: priceFeedAddress,
    usdtContract: usdtAddress,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
  };

  const deploymentsDir = path.join(process.cwd(), "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const outFilePath = path.join(deploymentsDir, `${network.name}.json`);
  fs.writeFileSync(outFilePath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n📄 Deployment configuration saved to: ${outFilePath}`);

  console.log("\n==================================================");
  console.log("🔍 CONTRACT VERIFICATION INSTRUCTIONS");
  console.log("==================================================");
  console.log("Run the following commands on BSCScan:");
  console.log(
    `npx hardhat verify --network ${network.name} ${nftAddress} "${deployer.address}" "${priceFeedAddress}" "${initialBaseURI}"`
  );
  console.log(
    `npx hardhat verify --network ${network.name} ${stakingAddress} "${deployer.address}" "${nftAddress}"`
  );
  console.log("==================================================");
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
