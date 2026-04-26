"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { Connection } from "@solana/web3.js";
import { createSolanaClient, type SolanaClient, getClusterUrl } from "./solana-client";
import { useCluster } from "../components/cluster-context";

type SolanaContextValue = {
  client: SolanaClient;
  connection: Connection;
};

const SolanaClientContext = createContext<SolanaContextValue | null>(null);

export function SolanaClientProvider({ children }: { children: ReactNode }) {
  const { cluster } = useCluster();
  const client = useMemo(() => createSolanaClient(cluster), [cluster]);
  const connection = useMemo(() => new Connection(getClusterUrl(cluster), "processed"), [cluster]);

  const value = useMemo(() => ({ client, connection }), [client, connection]);

  return (
    <SolanaClientContext.Provider value={value}>
      {children}
    </SolanaClientContext.Provider>
  );
}

export function useSolanaClient() {
  const client = useContext(SolanaClientContext);
  if (!client)
    throw new Error("useSolanaClient must be used within SolanaClientProvider");
  return client;
}
