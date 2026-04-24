"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Hammer } from "./components/icons";
import { GridBackground } from "./components/grid-background";
import { FireParticles } from "./components/fire-particles";

export default function Home() {
  return (
    <div 
      className="relative min-h-screen paper-texture text-foreground selection:bg-primary/30 overflow-x-clip flex flex-col"
      suppressHydrationWarning
    >
      <GridBackground />
      <FireParticles />
      <header className="sticky top-0 z-50 w-full bg-background border-b-4 border-black py-4 px-8 md:px-16 flex items-center justify-between mb-8 md:mb-12 shadow-[0px_4px_0px_0px_rgba(0,0,0,1)]">
          {/* Logo Section */}
          <div className="flex items-center cursor-pointer -rotate-2 hover:rotate-0 transition-transform">
            <Image 
              src="/forge.png" 
              alt="Forge Logo" 
              width={350} 
              height={100} 
              className="h-14 md:h-[4rem] w-auto object-contain"
            />
          </div>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6">
            <Link href="#resources" className="brutalist-link">Home</Link>
            <span className="text-black/30 font-light text-2xl">/</span>
            <Link href="#accelerator" className="brutalist-link">About</Link>
            <span className="text-black/30 font-light text-2xl">/</span>
            <Link href="#faqs" className="brutalist-link">FAQs</Link>
          </nav>

          {/* Action Button */}
          <button className="brutalist-button px-8 py-3 bg-black text-white hover:bg-primary border-black border-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all">
            <div className="flex items-center gap-2">
              Get Started
              <ArrowRight weight="bold" />
            </div>
          </button>
      </header>

      {/* Hero Content Placeholder to show the vibe */}
      <main className="flex-1 pt-8 px-8 md:px-16 max-w-7xl mx-auto relative w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="relative z-10">
            {/* Scattered illustrative tape */}
            <div className="absolute -top-10 -left-8 brutalist-tape opacity-80" style={{ transform: 'rotate(-10deg)', fontSize: '0.6rem' }}>Let's Go!!</div>

            <h1 className="text-7xl md:text-8xl xl:text-9xl font-black uppercase leading-[0.85] mb-8 italic tracking-tighter text-black mix-blend-multiply flex flex-col">
              <span>Permanent</span>
              <span className="flex items-center gap-2 mt-4 mb-4">
                Pro <span className="brutalist-tape text-6xl md:text-7xl xl:text-8xl ml-2 px-4 py-2">Identity</span>
              </span>
              <span>On Solana</span>
            </h1>
            
            <div className="brutalist-card p-6 max-w-md bg-white relative">
              <div className="absolute -bottom-3 -right-3 brutalist-tape text-sm" style={{ transform: 'rotate(5deg)' }}>v1.0</div>
              <p className="font-bold text-[1.1rem] leading-snug relative z-15">
                The trustless freelance marketplace where every user is a verified human.
                <br /><br />
                Secure payments with smart contract escrow and earn Soulbound Tokens (SBTs) to build portable reputation.
              </p>
            </div>
          </div>
          
          <div className="relative mt-12 lg:mt-0">
             {/* Main Graphic Card */}
             <div className="brutalist-card aspect-video flex flex-col items-center justify-center bg-white overflow-hidden relative group">
                <Image 
                  src="/illustration2.jpg" 
                  alt="Illustration" 
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer"
                />
             </div>
             
             {/* Staggered illustrative sticker elements */}
             <div className="absolute -top-8 -right-8 w-28 h-28 brutalist-sticker text-white rotate-6 text-center leading-none p-2 z-20">
               <div className="flex flex-col items-center">
                 <span className="font-black text-3xl italic">LIVE</span>
                 <span className="font-bold text-sm">ON DEVNET</span>
               </div>
             </div>
             
             <div className="absolute -bottom-6 -left-6 w-24 h-24 brutalist-card bg-[#FFD700] rounded-full flex flex-col items-center justify-center -rotate-12 z-20">
                <span className="font-black text-xl leading-none">100%</span>
                <span className="font-bold text-xs mt-1">SECURE</span>
             </div>
          </div>
        </div>
      </main>
    </div>
  );
}
 