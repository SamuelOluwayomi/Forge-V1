import { getWallets } from "@wallet-standard/app";
import type { Wallet as StandardWallet } from "@wallet-standard/base";
import {
  StandardConnect,
  StandardDisconnect,
  type StandardConnectFeature,
  type StandardDisconnectFeature,
} from "@wallet-standard/features";
import {
  SolanaSignTransaction,
  SolanaSignAndSendTransaction,
  type SolanaSignTransactionFeature,
  type SolanaSignAndSendTransactionFeature,
} from "@solana/wallet-standard-features";
import type { Address } from "@solana/kit";
import type {
  WalletConnector,
  WalletConnectorMetadata,
  WalletSession,
} from "./types";

function isSolanaWallet(wallet: StandardWallet): boolean {
  return (
    StandardConnect in wallet.features &&
    wallet.chains.some((chain) => chain.startsWith("solana:"))
  );
}

/**
 * Attempts to trigger the wallet popup using the wallet's own native browser
 * API (window.solflare, window.phantom, etc.). These native APIs are battle-tested
 * to open popups reliably in Chrome, unlike the Wallet Standard's cross-context
 * messaging which Chrome sometimes blocks.
 *
 * After the native connect succeeds the wallet is "connected" to the page, so
 * a subsequent Wallet Standard connect({ silent: true }) returns the account
 * info without prompting a second time.
 *
 * Returns true if the native connect succeeded, false if not available.
 */
async function tryNativeConnect(walletName: string): Promise<boolean> {
  const w = window as any;
  const name = walletName.toLowerCase();

  try {
    if (name.includes("solflare") && w.solflare?.connect) {
      await w.solflare.connect();
      return true;
    }
    if (name.includes("phantom") && w.phantom?.solana?.connect) {
      await w.phantom.solana.connect();
      return true;
    }
    if (name.includes("backpack") && w.backpack?.connect) {
      await w.backpack.connect();
      return true;
    }
    if (name.includes("glow") && w.glow?.connect) {
      await w.glow.connect();
      return true;
    }
    if (name.includes("exodus") && w.exodus?.solana?.connect) {
      await w.exodus.solana.connect();
      return true;
    }
  } catch {
    // Native connect rejected/failed — fall through to Wallet Standard
    return false;
  }

  return false;
}

function createConnector(wallet: StandardWallet): WalletConnector {
  const metadata: WalletConnectorMetadata = {
    id: wallet.name,
    name: wallet.name,
    icon: wallet.icon,
  };

  return {
    ...metadata,
    connect: async (options) => {
      const connectFeature = wallet.features[
        StandardConnect
      ] as StandardConnectFeature[typeof StandardConnect];

      if (!options?.silent) {
        // Step 1: Try native API to open popup.
        // If successful, the extension unlocks for this page, allowing
        // silent connect to get the Wallet Standard account object.
        const usedNative = await tryNativeConnect(wallet.name);
        if (usedNative) {
          const { accounts } = await connectFeature.connect({ silent: true });
          const account = accounts[0] ?? wallet.accounts[0];
          if (!account) throw new Error("No accounts available after native connect");
          return buildSession(wallet, metadata, account);
        }
      }

      // Step 2: Fallback — use the Wallet Standard connect directly.
      // This is the original path and works fine in Brave + auto-reconnect flows.
      const { accounts } = await connectFeature.connect(
        options?.silent ? { silent: true } : undefined
      );

      const account = accounts[0] ?? wallet.accounts[0];
      if (!account) throw new Error("No accounts available");

      return buildSession(wallet, metadata, account);
    },
  };
}

/** Shared helper to build a WalletSession from a connected account */
function buildSession(
  wallet: StandardWallet,
  metadata: WalletConnectorMetadata,
  account: StandardWallet["accounts"][number]
): WalletSession {
  const walletAccount = {
    address: account.address as Address,
    publicKey: new Uint8Array(account.publicKey),
    label: account.label,
  };

  const hasSendTx = SolanaSignAndSendTransaction in wallet.features;
  const hasSignTx = SolanaSignTransaction in wallet.features;

  return {
    account: walletAccount,
    connector: metadata,
    disconnect: async () => {
      if (StandardDisconnect in wallet.features) {
        const feature = wallet.features[
          StandardDisconnect
        ] as StandardDisconnectFeature[typeof StandardDisconnect];
        await feature.disconnect();
      }
    },
    signTransaction: hasSignTx
      ? async (transaction: Uint8Array, chain: string) => {
          const feature = wallet.features[
            SolanaSignTransaction
          ] as SolanaSignTransactionFeature[typeof SolanaSignTransaction];
          const [result] = await feature.signTransaction({
            account,
            transaction,
            chain: chain as `${string}:${string}`,
          });
          return new Uint8Array(result.signedTransaction);
        }
      : undefined,
    sendTransaction: hasSendTx
      ? async (transaction: Uint8Array, chain: string) => {
          const feature = wallet.features[
            SolanaSignAndSendTransaction
          ] as SolanaSignAndSendTransactionFeature[typeof SolanaSignAndSendTransaction];
          const [result] = await feature.signAndSendTransaction({
            account,
            transaction,
            chain: chain as `${string}:${string}`,
          });
          return new Uint8Array(result.signature);
        }
      : undefined,
  };
}

export function discoverWallets(): WalletConnector[] {
  const { get } = getWallets();
  return get().filter(isSolanaWallet).map(createConnector);
}

export function watchWallets(
  onChange: (connectors: WalletConnector[]) => void
): () => void {
  const wallets = getWallets();

  function update() {
    onChange(wallets.get().filter(isSolanaWallet).map(createConnector));
  }

  const offRegister = wallets.on("register", update);
  const offUnregister = wallets.on("unregister", update);

  return () => {
    offRegister();
    offUnregister();
  };
}
