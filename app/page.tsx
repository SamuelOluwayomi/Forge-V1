"use client";

import Image from "next/image";
import Link from "next/link";

import { ClusterSelect } from "./components/cluster-select";
import { WalletButton } from "./components/wallet-button";
import { TunnelBackground } from "./components/tunnel-background";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-background text-foreground noise selection:bg-primary/30 aurora-bg">
      <TunnelBackground />
      <div className="relative z-20">
        <div className="capsule-nav-container">
          <div className="nav-pill px-4 py-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-primary to-orange-400 flex items-center justify-center">
              <div className="w-2.5 h-2.5 bg-white rounded-full shadow-[0_0_8px_white]" />
            </div>
            <span className="text-xl font-black tracking-tighter text-foreground pl-2 pr-1">
              Forge
            </span>
          </div>

          <nav className="nav-pill hidden md:flex">
            <Link href="#identity" className="nav-link-pill active">Identity</Link>
            <Link href="#escrow" className="nav-link-pill">Escrow</Link>
            <Link href="#reputation" className="nav-link-pill">Reputation</Link>
            <Link href="#marketplace" className="nav-link-pill">Marketplace</Link>
          </nav>

          <div className="nav-pill px-3 py-2">
             <div className="hidden lg:flex items-center gap-2">
                <ClusterSelect />
                <div className="w-[1px] h-4 bg-white/10 mx-1" />
             </div>
             <WalletButton />
          </div>
        </div>
      </div>
    </div>
  );
}