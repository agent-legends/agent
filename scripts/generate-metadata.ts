import fs from "fs";
import path from "path";

export interface AgentAttribute {
  trait_type: string;
  value: string | number;
}

export interface AgentMetadata {
  name: string;
  description: string;
  image: string;
  external_url: string;
  edition: number;
  attributes: AgentAttribute[];
}

const CLASSES = ["Phantom Operative", "Cipher Netrunner", "Vanguard Enforcer", "Specter Infiltrator", "Apex Commander", "Chrono Weaver"];
const CYBERNETICS = ["Quantum Neural Link v4", "Thermal HUD Visor", "Plasma Core Reactor", "Nanite Bio-Armor", "Sub-dermal Carbon Shield", "Overclocked Synapse"];
const WEAPONS = ["Railgun AR-99", "Electromagnetic Blade", "Photon Disruptor", "Dual Heavy Blasters", "Plasma Scythe", "Sonic Pulse Cannon"];
const ARMOR_TYPES = ["Kevlar-Graphene Hybrid", "Titanium Alloy Exoskeleton", "Chameleon Stealth Cloak", "Heavy Combat Rig", "Aegis Energy Mesh"];
const RARITIES = ["Common", "Rare", "Epic", "Legendary", "Mythic"];
const CLEARANCES = ["Level 1 - Restricted", "Level 2 - Confidential", "Level 3 - Secret", "Level 4 - Top Secret", "Level 5 - Black Ops"];

export function generateSingleMetadata(tokenId: number): AgentMetadata {
  // Deterministic attribute assignment based on tokenId
  const classIdx = (tokenId * 7) % CLASSES.length;
  const cyberIdx = (tokenId * 13) % CYBERNETICS.length;
  const weaponIdx = (tokenId * 17) % WEAPONS.length;
  const armorIdx = (tokenId * 19) % ARMOR_TYPES.length;
  const clearanceIdx = (tokenId * 23) % CLEARANCES.length;

  let rarity = "Common";
  if (tokenId % 100 === 0) rarity = "Mythic";
  else if (tokenId % 25 === 0) rarity = "Legendary";
  else if (tokenId % 10 === 0) rarity = "Epic";
  else if (tokenId % 3 === 0) rarity = "Rare";

  const powerRating = 70 + (tokenId % 30); // 70 to 99

  return {
    name: `Agent Legend #${tokenId}`,
    description: `Agent Legends 2.0 is an elite cyberpunk tactical operative on BNB Smart Chain. Staking this operative unlocks spin credits and USDT bounty rewards.`,
    image: `ipfs://bafybeidczpaz457x54jlwv2m3v3iugn56t4j65e5u7pwy5lq77kwe3q42a/${tokenId}.png`,
    external_url: `https://agentlegends.xyz/agent/${tokenId}`,
    edition: tokenId,
    attributes: [
      { trait_type: "Class", value: CLASSES[classIdx] },
      { trait_type: "Cybernetics", value: CYBERNETICS[cyberIdx] },
      { trait_type: "Primary Weapon", value: WEAPONS[weaponIdx] },
      { trait_type: "Tactical Armor", value: ARMOR_TYPES[armorIdx] },
      { trait_type: "Security Clearance", value: CLEARANCES[clearanceIdx] },
      { trait_type: "Rarity", value: rarity },
      { trait_type: "Power Rating", value: powerRating },
      { trait_type: "Staking Spin Yield", value: 1 },
    ],
  };
}

export function generateAllMetadata(count: number = 100, outputDir: string = "metadata") {
  const fullOutputDir = path.join(process.cwd(), outputDir);
  if (!fs.existsSync(fullOutputDir)) {
    fs.mkdirSync(fullOutputDir, { recursive: true });
  }

  console.log(`Generating ${count} sample Agent Legends 2.0 metadata files in ${fullOutputDir}...`);
  for (let id = 1; id <= count; id++) {
    const meta = generateSingleMetadata(id);
    fs.writeFileSync(path.join(fullOutputDir, `${id}.json`), JSON.stringify(meta, null, 2));
  }
  console.log(`Successfully generated metadata for IDs 1 to ${count}`);
}

const requestedCount = Number(process.argv[2] ?? "10000");
if (!Number.isInteger(requestedCount) || requestedCount < 1 || requestedCount > 10_000) {
  throw new Error("Metadata count must be an integer between 1 and 10,000.");
}

generateAllMetadata(requestedCount);

