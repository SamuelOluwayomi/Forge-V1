"use client";

import { useEffect, useState } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";

export function FireParticles() {
  const [init, setInit] = useState(false);

  useEffect(() => {
    // In @tsparticles/react v3, initialization is done this way instead of passing an `init` prop.
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      setInit(true);
    });
  }, []);

  if (!init) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 pointer-events-none mix-blend-screen opacity-80 overflow-hidden">
      <Particles
        id="tsparticles"
        className="w-full h-full"
        options={{
          fullScreen: { enable: false, zIndex: -1 },
          fpsLimit: 120,
          particles: {
            number: {
              value: 120,
              density: {
                enable: true,
                width: 1000,
                height: 1000,
              },
            },
            color: {
              value: ["#ffffff", "#ff8a00", "#e52e71", "#ffcc00", "#ff0000"],
            },
            shape: {
              type: "circle",
            },
            opacity: {
              value: { min: 0.1, max: 0.8 },
              animation: {
                enable: true,
                speed: 1.5,
                sync: false,
              },
            },
            size: {
              value: { min: 1, max: 6 },
              animation: {
                enable: true,
                speed: 3,
                sync: false,
              },
            },
            move: {
              enable: true,
              speed: { min: 2, max: 7 },
              direction: "top",
              random: true,
              straight: false,
              outModes: {
                default: "out",
              },
            },
          },
          interactivity: {
            events: {
              onHover: {
                enable: true,
                mode: "bubble",
              },
              resize: {
                enable: true,
              },
            },
            modes: {
              bubble: {
                distance: 250,
                size: 8,
                duration: 2,
                opacity: 1,
              },
            },
          },
          detectRetina: true,
        }}
      />
    </div>
  );
}
