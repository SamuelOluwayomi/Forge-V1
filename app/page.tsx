"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, GithubLogo, XLogo, TelegramLogo } from "./components/icons";
import { GridBackground } from "./components/grid-background";
import { FireParticles } from "./components/fire-particles";
import { Navbar } from "./components/navbar";
import { AnimateIn, StaggerIn, StaggerChild, ParallaxFloat } from "./components/scroll-animations";
import { ConnectModal } from "./components/connect-modal";

export default function Home() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <ConnectModal open={modalOpen} onClose={() => setModalOpen(false)} />
      <div
        className="relative min-h-screen paper-texture text-foreground selection:bg-primary/30 overflow-x-clip flex flex-col"
        suppressHydrationWarning
      >
      <GridBackground />
      <FireParticles />
      <Navbar onGetStarted={() => setModalOpen(true)} />

      <main id="home" className="scroll-mt-32 flex-1 pt-8 px-8 md:px-16 max-w-7xl mx-auto relative w-full">

        {/* ── HERO ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="relative z-10">
            <AnimateIn variant="stampIn" delay={0.1} className="absolute -top-10 -left-8">
              <div className="brutalist-tape opacity-80" style={{ transform: "rotate(-10deg)", fontSize: "0.6rem" }}>Let's Go!!</div>
            </AnimateIn>

            <StaggerIn baseDelay={0.1} staggerDelay={0.13}>
              <h1 className="text-7xl md:text-8xl xl:text-9xl font-black uppercase leading-[0.85] mb-8 italic tracking-tighter text-black mix-blend-multiply flex flex-col">
                <StaggerChild variant="slideDown"><span>Permanent</span></StaggerChild>
                <StaggerChild variant="fadeLeft">
                  <span className="flex items-center gap-2 mt-4 mb-4">
                    Pro <span className="brutalist-tape text-6xl md:text-7xl xl:text-8xl ml-2 px-4 py-2">Identity</span>
                  </span>
                </StaggerChild>
                <StaggerChild variant="fadeLeft"><span className="mt-2">On</span></StaggerChild>
                <StaggerChild variant="fadeLeft">
                  <span className="flex items-center gap-4 mt-2">
                    <div className="relative inline-block w-[0.8em] h-[0.8em] shrink-0 -rotate-6">
                      <Image draggable={false} src="/solana-sol-logo.png" alt="Solana" fill sizes="(max-width: 768px) 20vw, 10vw" className="object-contain" />
                    </div>
                    Solana
                  </span>
                </StaggerChild>
              </h1>
            </StaggerIn>

            <AnimateIn variant="fadeLeft" delay={0.55}>
              <div className="brutalist-card p-6 max-w-md bg-white relative">
                <div className="absolute -bottom-3 -right-3 brutalist-tape text-sm" style={{ transform: "rotate(5deg)" }}>v1.0</div>
                <p className="font-bold text-[1.1rem] leading-snug relative z-15">
                  You post the task. Funds lock in escrow. Work gets done. Escrow releases. Both wallets earn a permanent badge. That's Forge
                  <br /><br />
                  If you are a developer, Forge is your chance to prove yourself and your skillset. Forge your worth!
                </p>
              </div>
            </AnimateIn>
          </div>

          <AnimateIn variant="fadeRight" delay={0.2} className="relative mt-12 lg:mt-0">
            <ParallaxFloat>
              <div className="brutalist-card aspect-video flex flex-col items-center justify-center bg-white overflow-hidden relative group">
                <Image draggable={false} src="/illustration2.jpg" alt="Illustration" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer" />
              </div>
            </ParallaxFloat>

            <AnimateIn variant="stampIn" delay={0.5} className="absolute -top-8 -right-8 w-28 h-28 brutalist-sticker text-white rotate-6 text-center leading-none p-2 z-20">
              <div className="flex flex-col items-center">
                <span className="font-black text-3xl italic">LIVE</span>
                <span className="font-bold text-sm">ON DEVNET</span>
              </div>
            </AnimateIn>

            <AnimateIn variant="stampIn" delay={0.65} className="absolute -bottom-6 -left-6 w-24 h-24 brutalist-card bg-[#FFD700] rounded-full flex flex-col items-center justify-center -rotate-12 z-20">
              <span className="font-black text-xl leading-none">100%</span>
              <span className="font-bold text-xs mt-1">SECURE</span>
            </AnimateIn>
          </AnimateIn>
        </div>

        {/* ── WHAT IS THE DEAL ── */}
        <section id="about" className="scroll-mt-28 mt-32 pt-20 border-t-4 border-black relative pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <AnimateIn variant="fadeLeft" className="relative z-10 order-2 lg:order-1">
              <h2 className="text-6xl md:text-7xl font-black uppercase leading-[0.85] mb-8 italic tracking-tighter text-black mix-blend-multiply flex flex-col">
                <span>What Is</span>
                <span className="flex items-center gap-2 mt-4 mb-2">
                  The <span className="brutalist-tape text-5xl md:text-6xl px-4 py-2 ml-2 -rotate-3">Deal</span>
                </span>
                <span>With Forge?</span>
              </h2>
              <div className="brutalist-card p-8 bg-white relative">
                <div className="absolute -top-4 -right-4 brutalist-tape bg-black text-white text-xs px-2 py-1 rotate-6">INFO</div>
                <p className="font-bold text-lg leading-relaxed relative z-15">
                  You do the work. You get paid. Your reputation stays with you — forever.
                  <br /><br />
                  Forge puts USDC in escrow before work starts. Releases it when work is done. Mints an onchain badge to both wallets proving it happened.
                  <br /><br />
                  Your skills. Your proof. Your wallet.
                </p>
              </div>
            </AnimateIn>

            <AnimateIn variant="fadeRight" delay={0.15} className="relative z-10 w-full aspect-[4/3] lg:aspect-square order-1 lg:order-2">
              <div className="brutalist-card w-full h-full bg-white overflow-hidden relative group">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(#000 2px, transparent 2px)", backgroundSize: "30px 30px" }}></div>
                <Image draggable={false} src="/illustration3.jpg" alt="What is Forge" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover object-top group-hover:scale-[1.03] transition-transform duration-500 cursor-pointer" />
              </div>
              <AnimateIn variant="stampIn" delay={0.4} className="absolute -top-6 -right-6 w-20 h-20 brutalist-sticker bg-white text-black rotate-[12deg] flex items-center justify-center z-20">
                <span className="font-black text-4xl">?</span>
              </AnimateIn>
            </AnimateIn>
          </div>
        </section>

        {/* ── HOW DOES IT WORK ── */}
        <section className="scroll-mt-28 mt-32 pt-20 border-t-4 border-black relative pb-20">
          <div className="flex flex-col md:flex-row md:items-center gap-6 mb-16 relative z-10">
            <AnimateIn variant="rotateIn" className="relative w-24 h-24 md:w-32 md:h-32 shrink-0">
              <Image draggable={false} src="/gloves.png" alt="Boxing Gloves" fill sizes="(max-width: 768px) 25vw, 15vw" className="object-contain -rotate-12 hover:rotate-0 transition-transform duration-300" />
            </AnimateIn>
            <AnimateIn variant="fadeLeft" delay={0.2}>
              <h2 className="text-6xl md:text-7xl font-black uppercase leading-[0.85] italic tracking-tighter text-black mix-blend-multiply">
                How Does It<br />Even Work?
              </h2>
            </AnimateIn>
          </div>

          <StaggerIn className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-8" staggerDelay={0.15} baseDelay={0.1}>
            {/* Step 1 */}
            <StaggerChild variant="fadeUp" className="col-span-1 md:col-span-2 brutalist-card bg-white relative flex flex-col md:flex-row group mt-4">
              <div className="absolute -top-6 -right-2 md:-right-6 z-20">
                <div className="bg-[#FF90E8] absolute inset-0 translate-x-2 translate-y-2 border-2 border-black"></div>
                <div className="bg-black text-white px-4 md:px-6 py-2 md:py-3 relative border-2 border-black font-black text-xl md:text-2xl uppercase whitespace-nowrap">
                  1. Prove You're Human
                </div>
              </div>
              <div className="p-8 md:p-12 flex-1 flex flex-col justify-center order-2 md:order-1">
                <h3 className="text-3xl md:text-4xl font-black uppercase mb-4 text-black">Civic CAPTCHA Verification</h3>
                <p className="font-bold text-lg leading-relaxed text-black/80">Every user is verified as a real human via Civic CAPTCHA before interacting. No bots, no fake profiles.</p>
              </div>
              <div className="w-full md:w-2/5 aspect-[4/3] md:aspect-auto border-b-4 md:border-b-0 md:border-l-4 border-black relative overflow-hidden bg-gray-100 order-1 md:order-2">
                <Image draggable={false} src="/civic.jpg" alt="Civic Captcha" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover group-hover:scale-105 transition-transform" />
              </div>
            </StaggerChild>

            {/* Step 2 */}
            <StaggerChild variant="scaleIn" className="col-span-1 brutalist-card bg-white relative flex flex-col group mt-4">
              <div className="w-full aspect-[4/3] relative bg-[#FFD700] border-b-4 border-black overflow-hidden">
                <Image draggable={false} src="/graphic.png" alt="USDC Escrow" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-contain p-8 group-hover:scale-105 transition-transform" />
              </div>
              <div className="relative z-20 -mt-6 mx-auto w-11/12 max-w-[90%]">
                <div className="bg-[#4ADE80] absolute inset-0 translate-x-1.5 translate-y-1.5 border-2 border-black"></div>
                <div className="bg-black text-white px-2 py-3 relative border-2 border-black font-black text-lg md:text-xl uppercase text-center whitespace-nowrap overflow-hidden text-ellipsis">
                  2. Lock USDC In Escrow
                </div>
              </div>
              <div className="p-8 pt-8 flex-1 flex items-center">
                <p className="font-bold text-base leading-relaxed text-center w-full">Task is posted. USDC locks into a Solana PDA smart contract when a worker is selected. It only releases on approval.</p>
              </div>
            </StaggerChild>

            {/* Step 3 */}
            <StaggerChild variant="scaleIn" className="col-span-1 brutalist-card bg-white relative flex flex-col group mt-4">
              <div className="w-full aspect-[4/3] relative bg-white border-b-4 border-black overflow-hidden">
                <Image draggable={false} src="/review.png" alt="AI Review" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover group-hover:scale-105 transition-transform" />
              </div>
              <div className="relative z-20 -mt-6 mx-auto w-11/12 max-w-[90%]">
                <div className="bg-[#60A5FA] absolute inset-0 translate-x-1.5 translate-y-1.5 border-2 border-black"></div>
                <div className="bg-black text-white px-2 py-3 relative border-2 border-black font-black text-lg md:text-xl uppercase text-center whitespace-nowrap overflow-hidden text-ellipsis">
                  3. AI Submission Review
                </div>
              </div>
              <div className="p-8 pt-8 flex-1 flex items-center">
                <p className="font-bold text-base leading-relaxed text-center w-full">AI automatically checks the worker's submission against the original task requirements and produces a report.</p>
              </div>
            </StaggerChild>

            {/* Step 4 */}
            <StaggerChild variant="fadeUp" className="col-span-1 md:col-span-2 brutalist-card bg-white relative flex flex-col md:flex-row group mt-4 md:mt-8 mb-8">
              <div className="w-full md:w-2/5 aspect-[4/3] md:aspect-auto border-b-4 md:border-b-0 md:border-r-4 border-black relative overflow-hidden bg-[#FF4500]">
                <Image draggable={false} src="/sbt.jpg" alt="Soulbound Tokens" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover group-hover:scale-105 transition-transform" />
              </div>
              <div className="p-8 md:p-12 flex-1 flex flex-col justify-center">
                <h3 className="text-3xl md:text-4xl font-black uppercase mb-4 text-black">Earn Soulbound Badges</h3>
                <p className="font-bold text-lg leading-relaxed text-black/80">Non-transferable SBT badges are minted to both worker and client wallets on every completed task to build reputation.</p>
              </div>
              <div className="absolute -bottom-6 -left-2 md:-left-6 z-20">
                <div className="bg-[#FFD700] absolute inset-0 translate-x-2 translate-y-2 border-2 border-black"></div>
                <div className="bg-black text-white px-4 md:px-6 py-2 md:py-3 relative border-2 border-black font-black text-xl md:text-2xl uppercase whitespace-nowrap">
                  4. Forge Reputation
                </div>
              </div>
            </StaggerChild>
          </StaggerIn>
        </section>

        {/* ── GOALS ── */}
        <section id="goals" className="scroll-mt-28 mt-32 pt-20 border-t-4 border-black relative pb-32">
          <div className="flex flex-col md:flex-row md:items-end gap-4 mb-16 relative z-10">
            <AnimateIn variant="fadeLeft">
              <h2 className="text-6xl md:text-7xl font-black uppercase leading-[0.85] italic tracking-tighter text-black mix-blend-multiply">
                What Do We<br />Hope To<br />Achieve?
              </h2>
            </AnimateIn>
            <AnimateIn variant="stampIn" delay={0.3} className="relative w-40 h-40 md:w-52 md:h-52 shrink-0 self-end md:self-auto mb-2">
              <Image draggable={false} src="/goals.png" alt="Goals" fill sizes="(max-width: 768px) 40vw, 20vw" className="object-contain drop-shadow-2xl" />
            </AnimateIn>
          </div>

          <StaggerIn className="grid grid-cols-1 lg:grid-cols-2 gap-8" staggerDelay={0.18}>
            {/* Hackathon Goals */}
            <StaggerChild variant="fadeLeft" className="brutalist-card bg-white relative flex flex-col overflow-hidden">
              <div className="bg-black text-white p-6 border-b-4 border-black relative">
                <div className="absolute -top-0 -right-2 brutalist-tape bg-primary text-white text-xs px-3 py-1 rotate-3 z-10">NOW → MAY 11</div>
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-3 h-3 rounded-full bg-[#4ADE80]"></div>
                  <span className="font-black text-xs uppercase tracking-widest text-[#4ADE80]">Phase 1</span>
                </div>
                <h3 className="text-3xl md:text-4xl font-black uppercase">Hackathon<br />Sprint Goals</h3>
                <a href="https://colosseum.com/frontier" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-3 bg-white text-black px-4 py-2 font-black text-sm uppercase border-2 border-white hover:bg-primary hover:border-primary hover:text-white transition-all">
                  <div className="relative w-5 h-5 shrink-0">
                    <Image draggable={false} src="/solana-sol-logo.png" alt="Solana" fill sizes="5vw" className="object-contain" />
                  </div>
                  Solana Frontier Hackathon →
                </a>
              </div>
              <div className="p-8 flex flex-col gap-5 flex-1">
                {[
                  { week: "Week 1", label: "Ship forge_identity + forge_escrow programs to Solana devnet" },
                  { week: "Week 2", label: "forge_sbt program live — full escrow lifecycle working end-to-end" },
                  { week: "Week 3", label: "Frontend wired to all programs + Civic CAPTCHA + AI task generator" },
                  { week: "Week 4", label: "UI polish, Vercel deploy, demo video & hackathon README pitch" },
                ].map(({ week, label }) => (
                  <div key={week} className="flex items-start gap-4">
                    <div className="brutalist-tape shrink-0 text-xs px-2 py-1 mt-0.5 rotate-0">{week}</div>
                    <p className="font-bold text-base leading-snug">{label}</p>
                  </div>
                ))}
                <div className="mt-4 w-full aspect-video relative border-2 border-black overflow-hidden bg-gray-100">
                  <Image draggable={false} src="/illustration2.jpg" alt="Hackathon Sprint" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover opacity-80" />
                  <div className="absolute inset-0 bg-black/30 flex items-end p-4">
                    <span className="font-black text-white text-lg uppercase tracking-wide">Building in public. Shipping on time.</span>
                  </div>
                </div>
              </div>
            </StaggerChild>

            {/* Post-Hackathon Goals */}
            <StaggerChild variant="fadeRight" className="brutalist-card bg-white relative flex flex-col overflow-hidden">
              <div className="bg-[#FF4500] text-white p-6 border-b-4 border-black relative">
                <div className="absolute -top-0 -right-3 brutalist-tape bg-black text-white text-xs px-3 py-1 -rotate-2 z-10">POST-HACKATHON</div>
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-3 h-3 rounded-full bg-[#FFD700]"></div>
                  <span className="font-black text-xs uppercase tracking-widest text-[#FFD700]">Phase 2</span>
                </div>
                <h3 className="text-3xl md:text-4xl font-black uppercase">Startup<br />Vision Goals</h3>
                <p className="text-white/80 font-bold text-sm mt-2">The real startup is the identity infrastructure underneath the marketplace.</p>
              </div>
              <div className="p-8 flex flex-col gap-5 flex-1">
                {[
                  { month: "M 1–2", label: "GitHub integration + AI grading system — MVP with 100 beta developers" },
                  { month: "M 3–4", label: "Forge Score algorithm, public profiles & downloadable Profile Cards" },
                  { month: "M 5–6", label: "Social layer — follows, peer endorsements, posts & team collaboration" },
                  { month: "M 7+", label: "Enterprise hiring, DAO integrations & SBT verification API for external dApps" },
                ].map(({ month, label }) => (
                  <div key={month} className="flex items-start gap-4">
                    <div className="bg-black text-white shrink-0 text-xs px-2 py-1 font-black uppercase border-2 border-black mt-0.5">{month}</div>
                    <p className="font-bold text-base leading-snug">{label}</p>
                  </div>
                ))}
                <div className="mt-4 w-full aspect-video relative border-2 border-black overflow-hidden bg-gray-100">
                  <Image draggable={false} src="/hero-character-1.png" alt="Post Hackathon Vision" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover object-top" />
                  <div className="absolute inset-0 bg-[#FF4500]/40 flex items-end p-4">
                    <span className="font-black text-white text-lg uppercase tracking-wide">Forge becomes the LinkedIn developers deserve.</span>
                  </div>
                </div>
              </div>
            </StaggerChild>
          </StaggerIn>
        </section>

        {/* ── CTA + FOOTER ── */}
        <footer className="mt-32 border-t-4 border-black">
          {/* CTA Banner */}
          <div className="bg-black text-white px-8 md:px-16 py-20 flex flex-col items-center text-center gap-8 relative overflow-hidden">
            <AnimateIn variant="stampIn">
              <div className="brutalist-tape text-sm px-4 py-1 -rotate-2">Earn it. Prove it. Forge it.</div>
            </AnimateIn>
            <AnimateIn variant="fadeUp" delay={0.15}>
              <h2 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter leading-[0.85]">
                Now that you're all<br />caught up on what<br />
                <span className="text-primary">Forge</span> is about...
              </h2>
            </AnimateIn>
            <AnimateIn variant="fadeUp" delay={0.28}>
              <p className="font-bold text-lg text-white/70 max-w-md">
                Let's get started. Build your permanent onchain identity today.
              </p>
            </AnimateIn>
            <AnimateIn variant="scaleIn" delay={0.4}>
              <button
                id="cta-get-started"
                onClick={() => setModalOpen(true)}
                className="brutalist-button px-12 py-5 bg-primary text-white border-white border-2 shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all font-black text-xl uppercase flex items-center gap-3"
              >
                Get Started <ArrowRight size={24} weight="bold" />
              </button>
            </AnimateIn>
          </div>

          {/* Footer Content */}
          <div className="bg-background border-t-4 border-black px-8 md:px-16 py-16">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col lg:flex-row items-start justify-between gap-12 mb-16">
                <AnimateIn variant="fadeLeft" className="flex flex-col gap-4 max-w-sm">
                  <Image draggable={false} src="/forge.png" alt="Forge" width={200} height={60} className="h-12 w-auto object-contain -rotate-1" />
                  <p className="font-bold text-base leading-relaxed">
                    This project was built by <span className="font-black">Team Forge</span> for the Solana Frontier Hackathon 2026.
                  </p>
                  <a href="https://colosseum.com/frontier" target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 brutalist-tape text-sm self-start rotate-0">
                    <div className="relative w-4 h-4 shrink-0">
                      <Image draggable={false} src="/solana-sol-logo.png" alt="Solana" fill sizes="5vw" className="object-contain" />
                    </div>
                    Solana Frontier Hackathon →
                  </a>
                </AnimateIn>

                <AnimateIn variant="fadeRight" delay={0.2} className="brutalist-card bg-white p-6 flex flex-col sm:flex-row items-center sm:items-start gap-6 max-w-md w-full">
                  <div className="relative w-24 h-24 shrink-0 border-4 border-black rounded-full overflow-hidden bg-gray-100">
                    <Image draggable={false} src="/myavatar.png" alt="Samuel Oluwayomi" fill sizes="10vw" className="object-cover" />
                  </div>
                  <div className="flex flex-col gap-3 flex-1">
                    <div>
                      <div className="brutalist-tape text-xs px-2 py-1 self-start inline-block mb-2 rotate-0">Lead Developer</div>
                      <h3 className="text-2xl font-black uppercase">Samuel Oluwayomi</h3>
                    </div>
                    <div className="flex flex-col gap-2">
                      <a href="https://github.com/SamuelOluwayomi" target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 font-bold text-sm hover:text-primary transition-colors group">
                        <GithubLogo size={20} weight="fill" className="shrink-0 group-hover:scale-110 transition-transform" />
                        github.com/SamuelOluwayomi
                      </a>
                      <a href="https://x.com/The_devsam" target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 font-bold text-sm hover:text-primary transition-colors group">
                        <XLogo size={20} weight="fill" className="shrink-0 group-hover:scale-110 transition-transform" />
                        @The_devsam
                      </a>
                      <a href="https://t.me/DevSam01" target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 font-bold text-sm hover:text-primary transition-colors group">
                        <TelegramLogo size={20} weight="fill" className="shrink-0 group-hover:scale-110 transition-transform" />
                        @DevSam01
                      </a>
                    </div>
                  </div>
                </AnimateIn>
              </div>

              <div className="border-t-4 border-black pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="font-bold text-sm text-black/60">© 2026 Forge. Built on Solana. All rights reserved.</p>
                <p className="font-black text-sm uppercase tracking-widest">Earn it. Prove it. <span className="text-primary">Forge it.</span></p>
              </div>
            </div>
          </div>
        </footer>

      </main>
      </div>
    </>
  );
}