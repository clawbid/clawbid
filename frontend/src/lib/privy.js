'use client';

/**
 * PrivyProvider wrapper + useAuth hook
 * 
 * MODE: Simulation (no smart contract required)
 * Bets are recorded in backend DB only.
 * When smart contract is deployed later, set NEXT_PUBLIC_MARKET_ADDRESS
 * and the hook will automatically switch to onchain mode.
 */

import { PrivyProvider as BasePrivyProvider, usePrivy, useWallets } from '@privy-io/react-auth';
import { base } from 'viem/chains';
import { useCallback, useState, useEffect } from 'react';
import { api } from './api';

const MARKET_ADDRESS = process.env.NEXT_PUBLIC_MARKET_ADDRESS || '';
const SIMULATION_MODE = !MARKET_ADDRESS;

// ── Provider ──────────────────────────────────────────────────────────────────
export function PrivyProvider({ children }) {
  return (
    <BasePrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''}
      config={{
        appearance: {
          theme: 'dark',
          accentColor: '#00e5ff',
        },
        loginMethods: ['twitter', 'wallet', 'email'],
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
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

  const twitterHandle = user?.twitter?.username
    ? `@${user.twitter.username}`
    : null;

  const displayName = twitterHandle
    || (address ? `${address.slice(0, 6)}...${address.slice(-4)}` : null)
    || (user?.email?.address ? user.email.address.split('@')[0] : null);

  // ── USDC Balance (live from Base) ─────────────────────────────────────────
  const [usdcBalance, setUsdcBalance] = useState(0);
  useEffect(() => {
    if (!address) { setUsdcBalance(0); return; }
    const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
    const data = '0x70a08231' + address.slice(2).toLowerCase().padStart(64, '0');
    fetch('https://mainnet.base.org', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to: USDC, data }, 'latest'] }),
    })
      .then(r => r.json())
      .then(r => { if (r.result && r.result !== '0x') setUsdcBalance(parseInt(r.result, 16) / 1e6); })
      .catch(() => {});
  }, [address]);

  // ── Place Bet ───────────────────────────────────────────────────────────────
  // Simulation mode: save to DB only (no wallet tx required)
  // Onchain mode: sign USDC tx on Base (when contract deployed)
  const placeBet = useCallback(async (marketId, direction, amountUsdc) => {
    if (!authenticated) throw new Error('Please login first');

    if (SIMULATION_MODE) {
      // ── SIMULATION: just call backend API ──────────────────────────────────
      const headers = {};
      if (address) headers['wallet_address'] = address;

      const res = await api.post(`/api/markets/${marketId}/bet`, {
        direction,
        amount_usdc: amountUsdc,
        tx_hash: `sim_${Date.now()}`,   // fake tx hash for simulation
        privy_user_id: user?.id,
        twitter_handle: user?.twitter?.username || null,
      }, { headers });

      return { simulated: true, ...res.data };

    } else {
      // ── ONCHAIN: sign real USDC transaction ────────────────────────────────
      const { createWalletClient, custom, parseUnits } = await import('viem');

      const MARKET_ABI = [
        { name: 'placeBet', type: 'function', stateMutability: 'nonpayable',
          inputs: [{ name: 'marketId', type: 'uint256' }, { name: 'direction', type: 'uint8' }, { name: 'amount', type: 'uint256' }], outputs: [] },
      ];
      const ERC20_ABI = [
        { name: 'approve', type: 'function', stateMutability: 'nonpayable',
          inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
      ];

      const provider = await wallet.getEthereumProvider();
      const walletClient = createWalletClient({ chain: base, transport: custom(provider) });
      const amountWei = parseUnits(amountUsdc.toString(), 6);
      const USDC = process.env.NEXT_PUBLIC_USDC_ADDRESS || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

      const approveTx = await walletClient.writeContract({
        address: USDC, abi: ERC20_ABI, functionName: 'approve',
        args: [MARKET_ADDRESS, amountWei], account: address,
      });
      await new Promise(r => setTimeout(r, 3000));

      const betTx = await walletClient.writeContract({
        address: MARKET_ADDRESS, abi: MARKET_ABI, functionName: 'placeBet',
        args: [BigInt(marketId), direction === 'YES' ? 1 : 2, amountWei], account: address,
      });

      // Record in backend too
      await api.post(`/api/markets/${marketId}/bet`, {
        direction, amount_usdc: amountUsdc, tx_hash: betTx,
        privy_user_id: user?.id, twitter_handle: user?.twitter?.username,
      }, { headers: { wallet_address: address } });

      return { approveTx, betTx };
    }
  }, [authenticated, address, wallet, user]);

  return {
    ready,
    authenticated,
    user,
    wallet,
    address,
    displayName,
    twitterHandle,
    usdcBalance,
    simulationMode: SIMULATION_MODE,
    login,
    logout,
    placeBet,
  };
}
