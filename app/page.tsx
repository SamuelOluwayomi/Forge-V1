"use client";

import Image from "next/image";
import Link from "next/link";

import { ClusterSelect } from "./components/cluster-select";
import { WalletButton } from "./components/wallet-button";
import { FireParticles } from "./components/fire-particles";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-background text-foreground noise selection:bg-primary/30">
      <FireParticles />
      <div className="fixed inset-0 z-[1] pointer-events-none">
        <Image
          src="/background.webp"
          alt="Furnace Background"
          fill
          className="object-cover opacity-80"
          priority
        />
        <div className="absolute inset-0 bg-background/20 z-10" />
      </div>

      <div className="relative z-20">
        <header className="mx-auto flex items-center justify-between px-8 py-6 uppercase font-mono border-b border-border/20 bg-background/50 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="text-3xl font-black tracking-tighter text-primary drop-shadow-[0_0_15px_rgba(234,88,12,0.4)]">
              FORGE
            </span>
          </div>
          
          <nav className="hidden md:flex items-center gap-10 text-sm font-bold tracking-widest text-foreground">
            <Link href="#identity" className="hover:text-primary transition-colors">Identity</Link>
            <Link href="#escrow" className="hover:text-primary transition-colors">Escrow</Link>
            <Link href="#reputation" className="hover:text-primary transition-colors">Reputation</Link>
            <Link href="#marketplace" className="hover:text-primary transition-colors">Marketplace</Link>
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

        <main className="mx-auto max-w-7xl px-6">
          <section className="pt-32 pb-40 md:pt-48 md:pb-56 relative min-h-[80vh] border-x border-border/20 mx-4">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h40v40H0V0zm20 20h20v20H20V20zM0 20h20v20H0V20z\' fill=\'%23ea580c\' fill-opacity=\'0.02\' fill-rule=\'evenodd\'/%3E%3C/svg%3E')] z-[-1] opacity-50 mix-blend-screen mask-image:linear-gradient(to_bottom,white,transparent)"></div>
            {/* Hero content removed as requested */}
          </section>
        </main>
      </div>
    </div>
  );
}
