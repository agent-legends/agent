export function createSpinMessage(
  walletAddress: string,
  timestamp: number,
  requestId: string
): string {
  return [
    "Agent Legends Spin Request",
    `Wallet: ${walletAddress.toLowerCase()}`,
    `Timestamp: ${timestamp}`,
    `Request ID: ${requestId}`,
  ].join("\n");
}

export function createAdminLoginMessage(
  walletAddress: string,
  timestamp: number,
  requestId: string
): string {
  return [
    "Agent Legends Admin Login",
    `Wallet: ${walletAddress.toLowerCase()}`,
    `Timestamp: ${timestamp}`,
    `Request ID: ${requestId}`,
  ].join("\n");
}

export function createRewardClaimMessage(
  walletAddress: string,
  timestamp: number,
  spinId: string,
  claimId: string
): string {
  return [
    "Agent Legends Reward Claim",
    `Wallet: ${walletAddress.toLowerCase()}`,
    `Timestamp: ${timestamp}`,
    `Spin ID: ${spinId}`,
    `Claim ID: ${claimId}`,
  ].join("\n");
}
