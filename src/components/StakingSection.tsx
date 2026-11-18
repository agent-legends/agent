"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useChainId,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { bsc, bscTestnet } from "wagmi/chains";
import { isAddress } from "viem";
import { Clock, LockKeyhole, Shield, Sparkles, Unlock } from "lucide-react";
import { NFT_ABI } from "@/config/abis/nft";
import { STAKING_ABI } from "@/config/abis/staking";
import { getContractConfig } from "@/config/contracts";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

function formatDuration(seconds: bigint | undefined) {
  if (seconds === undefined) return "Checking on-chain lock…";
  if (seconds === 0n) return "Unlocked";
  const total = Number(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainingSeconds = total % 60;
  return `${hours}h ${minutes}m ${remainingSeconds}s remaining`;
}

export function StakingSection() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const config = getContractConfig(chainId);
  const nftAddress = config && isAddress(config.nft) ? config.nft : undefined;
  const stakingAddress = config && isAddress(config.staking) ? config.staking : undefined;
  const chain = chainId === 97 ? bscTestnet : bsc;
  const [tokenIdInput, setTokenIdInput] = useState("");
  const [pendingAction, setPendingAction] = useState<"APPROVE" | "STAKE" | "UNSTAKE" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncedHash, setSyncedHash] = useState<string | null>(null);

  const tokenId = useMemo(
    () => (/^\d+$/.test(tokenIdInput) ? BigInt(tokenIdInput) : undefined),
    [tokenIdInput]
  );

  const ownerQuery = useReadContract({
    address: nftAddress,
    abi: NFT_ABI,
    functionName: "ownerOf",
    args: tokenId === undefined ? undefined : [tokenId],
    query: { enabled: Boolean(nftAddress && tokenId !== undefined) },
  });
  const stakeInfoQuery = useReadContract({
    address: stakingAddress,
    abi: STAKING_ABI,
    functionName: "stakeInfo",
    args: tokenId === undefined ? undefined : [tokenId],
    query: { enabled: Boolean(stakingAddress && tokenId !== undefined) },
  });
  const lockQuery = useReadContract({
    address: stakingAddress,
    abi: STAKING_ABI,
    functionName: "STAKING_LOCK",
    query: { enabled: Boolean(stakingAddress) },
  });
  const remainingQuery = useReadContract({
    address: stakingAddress,
    abi: STAKING_ABI,
    functionName: "getStakeTimeRemaining",
    args: tokenId === undefined ? undefined : [tokenId],
    query: { enabled: Boolean(stakingAddress && tokenId !== undefined) },
  });
  const creditsQuery = useReadContract({
    address: stakingAddress,
    abi: STAKING_ABI,
    functionName: "spinCredits",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(stakingAddress && address) },
  });
  const initialSpinQuery = useReadContract({
    address: stakingAddress,
    abi: STAKING_ABI,
    functionName: "hasReceivedInitialSpin",
    args: tokenId === undefined ? undefined : [tokenId],
    query: { enabled: Boolean(stakingAddress && tokenId !== undefined) },
  });
  const approvalQuery = useReadContract({
    address: nftAddress,
    abi: NFT_ABI,
    functionName: "isApprovedForAll",
    args: address && stakingAddress ? [address, stakingAddress] : undefined,
    query: { enabled: Boolean(nftAddress && address && stakingAddress) },
  });

  const { data: hash, isPending: isWalletPending, writeContractAsync } = useWriteContract();
  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
  } = useWaitForTransactionReceipt({ hash, confirmations: 3 });
  const isBusy = isWalletPending || isConfirming;
  const staker = stakeInfoQuery.data?.[0];
  const isStaked = Boolean(staker && staker.toLowerCase() !== ZERO_ADDRESS);
  const isStakedByUser = Boolean(address && staker?.toLowerCase() === address.toLowerCase());
  const isOwnedByUser = Boolean(address && ownerQuery.data?.toLowerCase() === address.toLowerCase());
  const timeRemaining = remainingQuery.data;
  const isUnlocked = timeRemaining === 0n;
  const isApproved = approvalQuery.data === true;

  const refreshChainData = useCallback(async () => {
    await Promise.all([
      ownerQuery.refetch(),
      stakeInfoQuery.refetch(),
      lockQuery.refetch(),
      remainingQuery.refetch(),
      creditsQuery.refetch(),
      initialSpinQuery.refetch(),
      approvalQuery.refetch(),
    ]);
  }, [
    ownerQuery.refetch,
    stakeInfoQuery.refetch,
    lockQuery.refetch,
    remainingQuery.refetch,
    creditsQuery.refetch,
    initialSpinQuery.refetch,
    approvalQuery.refetch,
  ]);

  useEffect(() => {
    if (!isConfirmed || !hash || !address || !pendingAction || syncedHash === hash) return;
    setSyncedHash(hash);

    if (pendingAction === "APPROVE") {
      setPendingAction(null);
      void refreshChainData().catch((error: unknown) => {
        setActionError(error instanceof Error ? error.message : "Approval status could not be refreshed.");
      });
      return;
    }

    fetch("/api/staking/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress: address, txHash: hash }),
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Staking activity could not be synchronized.");
        await refreshChainData();
        setPendingAction(null);
      })
      .catch((error: unknown) => {
        setSyncError(error instanceof Error ? error.message : "Staking activity could not be synchronized.");
        setPendingAction(null);
      });
  }, [isConfirmed, hash, address, pendingAction, syncedHash, refreshChainData]);

  const handleAction = async (action: "APPROVE" | "STAKE" | "UNSTAKE") => {
    if (!address || !nftAddress || !stakingAddress || tokenId === undefined) return;
    setActionError(null);
    setSyncError(null);
    setPendingAction(action);
    try {
      if (action === "APPROVE") {
        await writeContractAsync({
          address: nftAddress,
          account: address,
          abi: NFT_ABI,
          functionName: "setApprovalForAll",
          args: [stakingAddress, true],
          chain,
        });
      } else if (action === "STAKE") {
        await writeContractAsync({
          address: stakingAddress,
          account: address,
          abi: STAKING_ABI,
          functionName: "stake",
          args: [tokenId],
          chain,
        });
      } else {
        await writeContractAsync({
          address: stakingAddress,
          account: address,
          abi: STAKING_ABI,
          functionName: "unstake",
          args: [tokenId],
          chain,
        });
      }
    } catch (error: unknown) {
      setPendingAction(null);
      setActionError(error instanceof Error ? error.message : "The wallet rejected the transaction.");
    }
  };

  const contractReady = Boolean(nftAddress && stakingAddress);
  const canStake = Boolean(isConnected && isOwnedByUser && !isStaked && isApproved && !isBusy);
  const canApprove = Boolean(isConnected && isOwnedByUser && !isApproved && !isBusy);
  const canUnstake = Boolean(isConnected && isStakedByUser && isUnlocked && !isBusy);
  const lockHours = lockQuery.data === undefined ? null : Number(lockQuery.data) / 3600;

  return (
    <section className="staking-shell" aria-label="On-chain NFT staking">
      <header className="staking-shell-heading">
        <span className="page-kicker"><LockKeyhole aria-hidden="true" /> Non-custodial interface · BNB Smart Chain</span>
        <h2>Stake an Agent Legend</h2>
        <p>Enter a token ID to check ownership and staking state directly against the verified contracts. This collection does not expose enumerable NFT methods.</p>
      </header>

      <div className="staking-credit-card">
        <Sparkles aria-hidden="true" />
        <div><span>On-chain spin credits</span><strong>{creditsQuery.data?.toString() ?? "—"}</strong></div>
      </div>

      {!isConnected ? (
        <p className="staking-note">Connect a wallet to query your token and spin-credit state.</p>
      ) : !contractReady ? (
        <p className="staking-error" role="alert">NFT and staking contract addresses are not configured for this network.</p>
      ) : (
        <>
          <label className="staking-token-field" htmlFor="staking-token-id">
            Token ID
            <input
              id="staking-token-id"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Enter an Agent Legend token ID"
              value={tokenIdInput}
              onChange={(event) => setTokenIdInput(event.target.value.trim())}
              disabled={isBusy}
            />
          </label>

          {tokenId !== undefined && (
            <div className="staking-token-state" aria-live="polite">
              {ownerQuery.isLoading || stakeInfoQuery.isLoading ? (
                <p>Reading ownership and stake state…</p>
              ) : ownerQuery.error ? (
                <p role="alert">This token ID could not be verified on the configured NFT contract.</p>
              ) : isStakedByUser ? (
                <>
                  <p><LockKeyhole aria-hidden="true" /> Token #{tokenId.toString()} is staked by this wallet.</p>
                  <p><Clock aria-hidden="true" /> {formatDuration(timeRemaining)}</p>
                  <p>{initialSpinQuery.data ? "Its one-time initial spin was already awarded." : "No initial spin has been recorded for this token."}</p>
                  <button type="button" onClick={() => void handleAction("UNSTAKE")} disabled={!canUnstake}>
                    <Unlock aria-hidden="true" />
                    {isBusy ? "Waiting for transaction…" : isUnlocked ? "Unstake NFT" : "NFT is time-locked"}
                  </button>
                </>
              ) : isStaked ? (
                <p role="status">This token is currently staked by another wallet.</p>
              ) : isOwnedByUser ? (
                <>
                  <p><Shield aria-hidden="true" /> Token #{tokenId.toString()} is owned by this wallet.</p>
                  <p>
                    {initialSpinQuery.data
                      ? "This token has already received its one-time initial spin."
                      : "The first successful stake grants one initial spin credit."}
                  </p>
                  {!isApproved ? (
                    <button type="button" onClick={() => void handleAction("APPROVE")} disabled={!canApprove}>
                      {isBusy ? "Waiting for transaction…" : "Approve staking contract"}
                    </button>
                  ) : (
                    <button type="button" onClick={() => void handleAction("STAKE")} disabled={!canStake}>
                      {isBusy ? "Waiting for transaction…" : "Stake this NFT"}
                    </button>
                  )}
                </>
              ) : (
                <p role="status">This wallet does not own this token, and it is not shown as staked by this wallet.</p>
              )}
            </div>
          )}

          <p className="staking-lock-note">
            <Clock aria-hidden="true" />
            {lockHours === null ? "Reading the contract lock duration…" : `The contract enforces a ${lockHours}-hour minimum staking lock.`}
            {" "}Unused spin credits remain on-chain after unstaking.
          </p>
        </>
      )}

      {(actionError || syncError) && (
        <p className="staking-error" role="alert">{actionError || syncError}</p>
      )}
      {hash && isConfirmed && (
        <p className="staking-confirmed" role="status">
          Transaction confirmed. <a href={`${config?.explorer}/tx/${hash}`} target="_blank" rel="noopener noreferrer">View on explorer</a>
        </p>
      )}
    </section>
  );
}
