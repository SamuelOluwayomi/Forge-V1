"use client";

import Image from "next/image";
import Link from "next/link";

import { ClusterSelect } from "./components/cluster-select";
import { WalletButton } from "./components/wallet-button";
import { FireParticles } from "./components/fire-particles";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-background text-foreground noise selection:bg-primary/30 aurora-bg">
      <div className="relative z-20">
        <div className="p-4 relative z-50">
          <header className="mx-auto flex items-center justify-between px-8 py-5 font-sans clay-navbar army-texture rounded-3xl">
            <div className="flex items-center gap-2">
              <span className="text-3xl font-black tracking-tighter text-primary drop-shadow-[0_2px_4px_rgba(35,39,15,0.8)]">
                FORGE
              </span>
            </div>
            
            <nav className="hidden md:flex items-center gap-10 text-sm font-bold tracking-widest text-foreground">
              <Link href="#identity" className="hover:text-primary transition-colors hover:drop-shadow-[0_0_8px_rgba(234,88,12,0.8)]">Identity</Link>
              <Link href="#escrow" className="hover:text-primary transition-colors hover:drop-shadow-[0_0_8px_rgba(234,88,12,0.8)]">Escrow</Link>
              <Link href="#reputation" className="hover:text-primary transition-colors hover:drop-shadow-[0_0_8px_rgba(234,88,12,0.8)]">Reputation</Link>
              <Link href="#marketplace" className="hover:text-primary transition-colors hover:drop-shadow-[0_0_8px_rgba(234,88,12,0.8)]">Marketplace</Link>
            </nav>

            <div className="flex items-center gap-4">
              <div className="hidden lg:flex items-center gap-2">
                 <ClusterSelect />
              </div>

              <div className="ml-2">
                  <WalletButton />
              </div>
            </div>
          </header>
        </div>

        <main className="mx-auto max-w-7xl px-4 mt-8">
          <section className="pt-32 pb-40 md:pt-48 md:pb-56 relative min-h-[80vh] clay-panel army-texture rounded-[3rem] mx-2 flex flex-col items-center justify-center">
            {/* Hero content removed as requested */}
          </section>
        </main>
      </div>
    </div>
  );
}