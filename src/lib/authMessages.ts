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
