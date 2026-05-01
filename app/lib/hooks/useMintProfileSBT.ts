"use client";

import { useWallet } from "@/app/lib/wallet/context";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  createNft,
  mplTokenMetadata,
} from "@metaplex-foundation/mpl-token-metadata";
import {
  generateSigner,
  percentAmount,
  none,
} from "@metaplex-foundation/umi";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { useCallback, useState } from "react";

export function useMintProfileSBT() {
  const { wallet } = useWallet();
  const [minting, setMinting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadToIPFS = async (
    type: "image" | "metadata",
    data: File | object
  ) => {
    const formData = new FormData();
    formData.append("type", type);

    if (type === "image" && data instanceof File) {
      formData.append("file", data);
    } else {
      formData.append("metadata", JSON.stringify(data));
    }

    const res = await fetch("/api/upload-to-ipfs", {
      method: "POST",
      body: formData,
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.error);
    return result.uri as string;
  };

  const mintProfileSBT = useCallback(
    async (profile: {
      name: string;
      title: string;
      avatarUrl: string;    // Supabase URL fallback
      avatarFile?: File;    // Original file if available
    }): Promise<string | null> => {
      if (!wallet?.account?.address) {
        setError("Wallet not connected");
        return null;
      }

      setMinting(true);
      setError(null);

      try {
        // Step 1 — Upload image to IPFS
        let imageUri = profile.avatarUrl;

        if (profile.avatarFile) {
          // Upload original file to IPFS
          imageUri = await uploadToIPFS("image", profile.avatarFile);
        } else if (profile.avatarUrl) {
          // Fetch from Supabase URL and re-upload to IPFS
          const response = await fetch(profile.avatarUrl);
          const blob = await response.blob();
          const file = new File([blob], "avatar.png", { type: blob.type });
          imageUri = await uploadToIPFS("image", file);
        }

        // Step 2 — Build and upload metadata JSON to IPFS
        const metadata = {
          name: `${profile.name} — Forge Identity`,
          symbol: "FORGE",
          description: `Onchain identity credential for ${profile.name} on Forge — the trustless freelance marketplace on Solana.`,
          image: imageUri,
          external_url: `https://forge-frontier.vercel.app/dashboard/profile`,
          attributes: [
            { trait_type: "Platform", value: "Forge" },
            { trait_type: "Name", value: profile.name },
            { trait_type: "Title", value: profile.title },
            {
              trait_type: "Wallet",
              value: wallet.account.address,
            },
            {
              trait_type: "Joined",
              value: new Date().toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              }),
            },
            { trait_type: "Type", value: "Profile Identity SBT" },
          ],
          properties: {
            category: "identity",
            creators: [
              {
                address: wallet.account.address,
                share: 100,
              },
            ],
          },
        };

        const metadataUri = await uploadToIPFS("metadata", metadata);

        // Step 3 — Mint the NFT/SBT using Metaplex
        // We use the devnet RPC
        const umi = createUmi("https://api.devnet.solana.com")
          .use(mplTokenMetadata())
          .use(walletAdapterIdentity(wallet as any));

        const mint = generateSigner(umi);

        await createNft(umi, {
          mint,
          name: `${profile.name.slice(0, 20)} — Forge Identity`,
          symbol: "FORGE",
          uri: metadataUri,
          sellerFeeBasisPoints: percentAmount(0),
          isMutable: false,
          collection: none(),
        }).sendAndConfirm(umi);

        const mintAddress = mint.publicKey.toString();
        console.log("✓ Profile SBT minted:", mintAddress);

        return mintAddress;
      } catch (e: any) {
        const msg = e?.message ?? "Failed to mint profile SBT";
        setError(msg);
        console.error("mintProfileSBT error:", e);
        return null;
      } finally {
        setMinting(false);
      }
    },
    [wallet]
  );

  return { mintProfileSBT, minting, error };
}
