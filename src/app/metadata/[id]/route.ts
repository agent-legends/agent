import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const rawId = id.replace(/\.json$/i, "");
  const tokenId = parseInt(rawId, 10);

  if (isNaN(tokenId) || tokenId < 1 || tokenId > 2000) {
    return NextResponse.json({ error: "Token ID out of bounds (1 - 2000)" }, { status: 404 });
  }

  const metadata = {
    name: `Agent Legend #${tokenId}`,
    description:
      "Agent Legends is an elite AI Agent operative collection on BNB Smart Chain. Capped strictly at 2,000 supply with SPACE ID .ai Agent verification.",
    image: "https://agent.agentlegends.workers.dev/agent-legends-logo.jpg",
    external_url: "https://agent.agentlegends.workers.dev",
    attributes: [
      { trait_type: "Network", value: "BNB Smart Chain" },
      { trait_type: "Chain ID", value: 56 },
      { trait_type: "Contract", value: "0x5690B34dA3eFc5d55511c37A0Ad4988CACE8d912" },
      { trait_type: "Class", value: "Operative" },
      { trait_type: "Generation", value: "Gen 1" },
      { trait_type: "Agent ID Integration", value: "SPACE ID .ai" },
      { trait_type: "Max Supply", value: 2000 },
      { trait_type: "Token ID", value: tokenId },
    ],
  };

  return NextResponse.json(metadata, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=31536000, immutable",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
