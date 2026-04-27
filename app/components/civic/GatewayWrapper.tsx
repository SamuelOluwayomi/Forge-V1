"use client";

import { GatewayProvider } from "@civic/solana-gateway-react";
import { useWallet } from "@/app/lib/wallet/context";
import { useSolanaClient } from "@/app/lib/solana-client-context";
import { useCluster } from "@/app/components/cluster-context";
import { PublicKey, Transaction } from "@solana/web3.js";

// Civic CAPTCHA Gatekeeper Network (Full Devnet Address)
const CIVIC_GATEKEEPER_NETWORK = new PublicKey("ignREusXmGrscGNUesoU9mxfds9AiYTezUKex2PsZV6");

export function GatewayWrapper({ children }: { children: React.ReactNode }) {
  const { wallet } = useWallet();
  const { connection } = useSolanaClient();
  const { cluster } = useCluster();

  // Map our custom wallet to the interface expected by Civic SDK
  const civicWallet = wallet ? {
    publicKey: new PublicKey(wallet.account.address),
    connected: true,
    signTransaction: async (transaction: Transaction) => {
        if (!wallet.signTransaction) throw new Error("Wallet cannot sign");
        const serialized = transaction.serialize({ requireAllSignatures: false });
        const signed = await wallet.signTransaction(serialized, `solana:${cluster}`);
        return Transaction.from(signed);
    }
  } : undefined;

  return (
    <GatewayProvider
      wallet={civicWallet as any}
      gatekeeperNetwork={CIVIC_GATEKEEPER_NETWORK}
      connection={connection}
      cluster={cluster as any}
    >
      {children}
    </GatewayProvider>
  );
}
