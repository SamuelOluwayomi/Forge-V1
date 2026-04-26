"use client";

import { useEscrow } from "@/app/lib/hooks/useEscrow";

export default function DebugEscrow() {
  const { program } = useEscrow();

  return (
    <div style={{ margin: "2rem", padding: "1rem", border: "2px solid #FF4500" }}>
      <h3 style={{ marginBottom: "0.5rem" }}>Escrow Hook Test</h3>
      <p>
        Program ID:{' '}
        {program?.programId.toBase58() ?? "loading…"}
      </p>
    </div>
  );
}
