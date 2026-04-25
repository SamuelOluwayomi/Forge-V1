"use client";

import { motion, useInView, Variants } from "framer-motion";
import { useRef, ReactNode } from "react";

interface AnimateInProps {
  children: ReactNode;
  className?: string;
  variant?: "fadeUp" | "fadeLeft" | "fadeRight" | "scaleIn" | "rotateIn" | "stampIn" | "slideDown";
  delay?: number;
  duration?: number;
  once?: boolean;
}

const variants: Record<string, Variants> = {
  fadeUp: {
    hidden: { opacity: 0, y: 48 },
    visible: { opacity: 1, y: 0 },
  },
  fadeLeft: {
    hidden: { opacity: 0, x: -60 },
    visible: { opacity: 1, x: 0 },
  },
  fadeRight: {
    hidden: { opacity: 0, x: 60 },
    visible: { opacity: 1, x: 0 },
  },
  scaleIn: {
    hidden: { opacity: 0, scale: 0.85 },
    visible: { opacity: 1, scale: 1 },
  },
  rotateIn: {
    hidden: { opacity: 0, rotate: -8, scale: 0.9 },
    visible: { opacity: 1, rotate: 0, scale: 1 },
  },
  stampIn: {
    hidden: { opacity: 0, scale: 1.3, rotate: 6 },
    visible: { opacity: 1, scale: 1, rotate: 0 },
  },
  slideDown: {
    hidden: { opacity: 0, y: -40 },
    visible: { opacity: 1, y: 0 },
  },
};

const easings: Record<string, [number, number, number, number]> = {
  fadeUp: [0.22, 1, 0.36, 1],
  fadeLeft: [0.22, 1, 0.36, 1],
  fadeRight: [0.22, 1, 0.36, 1],
  scaleIn: [0.34, 1.56, 0.64, 1], // springy overshoot
  rotateIn: [0.22, 1, 0.36, 1],
  stampIn: [0.34, 1.3, 0.64, 1],  // stamp bounce
  slideDown: [0.22, 1, 0.36, 1],
};

export function AnimateIn({
  children,
  className,
  variant = "fadeUp",
  delay = 0,
  duration = 0.65,
  once = true,
}: AnimateInProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once, margin: "-80px 0px" });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={variants[variant]}
      transition={{
        duration,
        delay,
        ease: easings[variant],
      }}
    >
      {children}
    </motion.div>
  );
}

// Stagger wrapper — children animate in sequence
interface StaggerProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
  baseDelay?: number;
}

export function StaggerIn({ children, className, staggerDelay = 0.12, baseDelay = 0 }: StaggerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px 0px" });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: baseDelay,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

// Individual stagger child — use inside StaggerIn
export function StaggerChild({
  children,
  className,
  variant = "fadeUp",
}: {
  children: ReactNode;
  className?: string;
  variant?: keyof typeof variants;
}) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: variants[variant].hidden as any,
        visible: {
          ...(variants[variant].visible as any),
          transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

// Parallax wrapper — element moves at a different rate as you scroll
export function ParallaxFloat({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ y: 0 }}
      whileInView={{ y: -16 }}
      viewport={{ once: false, margin: "0px 0px -100px 0px" }}
      transition={{ duration: 1.2, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
