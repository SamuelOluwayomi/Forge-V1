"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "./icons";

const NAV_LINKS = [
  { label: "Home", href: "#home", id: "home" },
  { label: "About", href: "#about", id: "about" },
  { label: "Goals", href: "#goals", id: "goals" },
];

interface NavbarProps {
  onGetStarted?: () => void;
}

export function Navbar({ onGetStarted }: NavbarProps) {
  const [activeSection, setActiveSection] = useState("home");

  useEffect(() => {
    const aboutEl = document.getElementById("about");
    const goalsEl = document.getElementById("goals");

    const handleScroll = () => {
      const aboutTop = aboutEl?.getBoundingClientRect().top ?? 9999;
      const goalsTop = goalsEl?.getBoundingClientRect().top ?? 9999;
      const threshold = window.innerHeight * 0.45;

      if (goalsTop <= threshold) {
        setActiveSection("goals");
      } else if (aboutTop <= threshold) {
        setActiveSection("about");
      } else {
        setActiveSection("home");
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full bg-background border-b-4 border-black py-4 px-8 md:px-16 flex items-center justify-between mb-8 md:mb-12 shadow-[0px_4px_0px_0px_rgba(0,0,0,1)]">
      {/* Logo */}
      <div className="flex items-center cursor-pointer -rotate-2 hover:rotate-0 transition-transform">
        <Image
          draggable={false}
          src="/forge.png"
          alt="Forge Logo"
          width={350}
          height={100}
          className="h-14 md:h-[4rem] w-auto object-contain"
        />
      </div>

      {/* Navigation Links */}
      <nav className="hidden lg:flex items-center gap-6">
        {NAV_LINKS.map((link, i) => (
          <span key={link.id} className="flex items-center gap-6">
            <Link
              href={link.href}
              className={`brutalist-link ${activeSection === link.id ? "brutalist-link--active" : ""}`}
            >
              {link.label}
            </Link>
            {i < NAV_LINKS.length - 1 && (
              <span className="text-black/30 font-light text-2xl">/</span>
            )}
          </span>
        ))}
      </nav>

      {/* Action Button */}
      <button
        id="navbar-get-started"
        onClick={onGetStarted}
        className="brutalist-button px-8 py-3 bg-black text-white border-black border-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 active:bg-[#e0e0e0] active:text-black transition-all"
      >
        <div className="flex items-center gap-2">
          Get Started
          <ArrowRight weight="bold" />
        </div>
      </button>
    </header>
  );
}
