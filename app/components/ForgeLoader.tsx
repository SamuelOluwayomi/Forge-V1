"use client";

import React from "react";

export function ForgeLoader() {
  return (
    <div className="flex flex-col items-center justify-center p-12">
      <div className="relative w-20 h-20">
        {/* Outer rotating square */}
        <div className="absolute inset-0 border-4 border-black animate-[spin_3s_linear_infinite]" />
        {/* Inner rotating square (opposite direction) */}
        <div className="absolute inset-4 border-4 border-primary animate-[spin_2s_linear_infinite_reverse]" />
        {/* Center dot */}
        <div className="absolute inset-8 bg-black" />
      </div>
      <p className="mt-8 font-black text-xs uppercase tracking-[0.3em] text-black animate-pulse">
        Fetching Data...
      </p>
    </div>
  );
}

export function SkeletonLoader({ className }: { className?: string }) {
  return (
    <div className={`brutalist-card bg-white p-6 relative overflow-hidden ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
      <div className="space-y-3">
        <div className="h-4 bg-black/10 w-1/3" />
        <div className="h-8 bg-black/10 w-full" />
        <div className="h-4 bg-black/10 w-2/3" />
      </div>
    </div>
  );
}
