'use client';

/**
 * PrivyProvider wrapper + useAuth hook
 * 
 * Supports:
 *   - Twitter/X login
 *   - Wallet connect (MetaMask, WalletConnect, Coinbase)
 * 
 * Setup:
 *   1. npm install @privy-io/react-auth viem wagmi
 *   2. Get App ID from https://dashboard.privy.io
 *   3. Set NEXT_PUBLIC_PRIVY_APP_ID in .env.local
 */

import { PrivyProvider as BasePrivyProvider, usePrivy, useWallets } from '@privy-io/react-auth';
import { createWalletClient, custom, parseUnits, encodeFunctionData } from 'viem';
import { base } from 'viem/chains';
import { useCallback, useMemo } from 'react';

// ── ABI (only functions we need) ─────────────────────────────────────────────
export const MARKET_ABI = [
  {
    name: 'placeBet',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'marketId', type: 'uint256' },
      { name: 'direction', type: 'uint8' },   // 1=YES, 2=NO
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'claim',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'marketId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'calcPayout',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'marketId', type: 'uint256' },
      { name: 'trader', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getOdds',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'marketId', type: 'uint256' }],
    outputs: [
      { name: 'yesPct', type: 'uint256' },
      { name: 'noPct', type: 'uint256' },
    ],
  },
];

export const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
];

// ── Addresses ─────────────────────────────────────────────────────────────────
export const CONTRACTS = {
  USDC:   process.env.NEXT_PUBLIC_USDC_ADDRESS   || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
  MARKET: process.env.NEXT_PUBLIC_MARKET_ADDRESS || '',  // Set after deploying ClawBidMarket.sol
};

// ── Provider ──────────────────────────────────────────────────────────────────
export function PrivyProvider({ children }) {
  return (
    <BasePrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''}
      config={{
        appearance: {
          theme: 'dark',
          accentColor: '#00e5ff',
          logo: '/logo.png',
        },
        loginMethods: ['twitter', 'wallet'],
        embeddedWallets: {
          createOnLogin: 'users-without-wallets', // auto-create for Twitter users
        },
        defaultChain: base,
        supportedChains: [base],
      }}
    >
      {children}
    </BasePrivyProvider>
  );
}

// ── useAuth hook ──────────────────────────────────────────────────────────────
export function useAuth() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets } = useWallets();

  const wallet = wallets?.[0] || null;
  const address = wallet?.address || null;

  // Twitter handle if logged in via Twitter
  const twitterHandle = user?.twitter?.username
    ? `@${user.twitter.username}`
    : null;

  // Short display name
  const displayName = twitterHandle
    || (address ? `${address.slice(0, 6)}...${address.slice(-4)}` : null);

  // Get wallet client for signing transactions
  const getWalletClient = useCallback(async () => {
    if (!wallet) throw new Error('No wallet connected');
    const provider = await wallet.getEthereumProvider();
    return createWalletClient({
      chain: base,
      transport: custom(provider),
    });
  }, [wallet]);

  // Place bet: approve USDC + call placeBet
  const placeBet = useCallback(async (marketId, direction, amountUsdc) => {
    if (!address) throw new Error('Not connected');
    if (!CONTRACTS.MARKET) throw new Error('Market contract not deployed yet');

    const walletClient = await getWalletClient();
    const amountWei = parseUnits(amountUsdc.toString(), 6); // USDC = 6 decimals
    const directionInt = direction === 'YES' ? 1 : 2;

    // Step 1: Approve USDC
    const approveTx = await walletClient.writeContract({
      address: CONTRACTS.USDC,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [CONTRACTS.MARKET, amountWei],
      account: address,
    });

    // Wait for approval (simple delay — in prod use publicClient.waitForTransactionReceipt)
    await new Promise(r => setTimeout(r, 3000));

    // Step 2: Place bet
    const betTx = await walletClient.writeContract({
      address: CONTRACTS.MARKET,
      abi: MARKET_ABI,
      functionName: 'placeBet',
      args: [BigInt(marketId), directionInt, amountWei],
      account: address,
    });

    return { approveTx, betTx };
  }, [address, getWalletClient]);

  // Claim payout
  const claimPayout = useCallback(async (marketId) => {
    if (!address) throw new Error('Not connected');
    const walletClient = await getWalletClient();

    const tx = await walletClient.writeContract({
      address: CONTRACTS.MARKET,
      abi: MARKET_ABI,
      functionName: 'claim',
      args: [BigInt(marketId)],
      account: address,
    });

    return tx;
  }, [address, getWalletClient]);

  return {
    ready,
    authenticated,
    user,
    wallet,
    address,
    displayName,
    twitterHandle,
    login,
    logout,
    placeBet,
    claimPayout,
  };
}
