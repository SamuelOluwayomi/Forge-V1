"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

export function MobileGuard({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => {
      // 1024px is a common cutoff for "Desktop/Laptop" experiences
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  if (!mounted) return <>{children}</>;

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-[1000] bg-[#FDF3E3] paper-texture flex flex-col items-center justify-center p-6 text-center overflow-y-auto">
        {/* Logo */}
        <div className="mb-8">
          <Image
            src="/forge.png"
            alt="Forge"
            width={180}
            height={54}
            className="h-12 w-auto object-contain mx-auto"
            priority
          />
          <div className="brutalist-tape text-[10px] px-3 py-1 inline-block mt-2" style={{ transform: "rotate(-2deg)" }}>
            BETA — DESKTOP ONLY
          </div>
        </div>

        {/* Content */}
        <div className="brutalist-card bg-white p-8 max-w-sm border-4 border-black relative">
          <div className="absolute -top-4 -right-4 bg-primary text-white border-2 border-black px-3 py-1 font-black text-xs uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            Notice
          </div>
          
          <h1 className="text-3xl font-black uppercase mb-4 leading-none tracking-tighter">
            Laptop Required
          </h1>
          
          <p className="font-bold text-sm text-black/70 mb-6 leading-relaxed text-left">
            Forge is an <span className="text-black">onchain professional workstation</span> for developers. 
            Because we use complex IDE-like dashboards, multi-step escrow flows, and terminal interfaces, 
            the experience is optimized strictly for <span className="text-primary underline">laptops and desktops</span>.
          </p>

          <div className="bg-black/5 border-2 border-dashed border-black/20 p-4 mb-6 text-left">
            <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-2">What is Forge?</p>
            <p className="text-xs font-bold leading-snug italic">
              "A decentralized network where you earn USDC through escrow-secured tasks and mint Soulbound Tokens as permanent proof of your expertise."
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 justify-center text-[10px] font-black uppercase text-black/40">
              <span className="w-8 h-[2px] bg-black/10"></span>
              Switch to Desktop
              <span className="w-8 h-[2px] bg-black/10"></span>
            </div>
            
            <p className="text-[10px] font-bold text-black/50 uppercase tracking-widest">
              forge-frontier.vercel.app
            </p>
          </div>
        </div>

        {/* Floating elements for aesthetic */}
        <div className="fixed bottom-10 left-6 -rotate-12 pointer-events-none opacity-20">
          <div className="w-24 h-24 border-4 border-black rounded-full flex items-center justify-center font-black text-4xl">?</div>
        </div>
        <div className="fixed top-10 right-6 rotate-12 pointer-events-none opacity-20">
          <div className="w-20 h-20 border-4 border-black flex items-center justify-center font-black text-4xl">!</div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
