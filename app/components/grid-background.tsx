"use client";

export function GridBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
      {/* Ambient glow */}
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{
          background: [
            "radial-gradient(ellipse 40% 40% at 50% 50%, rgba(255,69,0,0.05) 0%, transparent 80%)",
          ].join(", "),
        }}
      />

      {/* Large grid — orange */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,69,0,0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,69,0,0.05) 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px",
        }}
      />

      {/* Small grid — orange */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,69,0,0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,69,0,0.05) 1px, transparent 1px)
          `,
          backgroundSize: "16px 16px",
        }}
      />
    </div>
  );
}
