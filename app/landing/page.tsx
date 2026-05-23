"use client";

import { useRef, useEffect, useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useInView,
  useMotionValue,
  useSpring,
  AnimatePresence,
} from "framer-motion";
import Link from "next/link";

// ─── Utility ─────────────────────────────────────────────────────────────────

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}

// ─── Animated counter ────────────────────────────────────────────────────────

function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 50, damping: 20 });

  useEffect(() => {
    if (inView) mv.set(to);
  }, [inView, mv, to]);

  useEffect(() => {
    return spring.on("change", (v) => {
      if (ref.current) ref.current.textContent = Math.round(v).toLocaleString() + suffix;
    });
  }, [spring, suffix]);

  return <span ref={ref}>0{suffix}</span>;
}

// ─── Noise SVG overlay ───────────────────────────────────────────────────────

function NoiseOverlay() {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.025]" aria-hidden>
      <filter id="noise">
        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#noise)" />
    </svg>
  );
}

// ─── Animated grid lines ─────────────────────────────────────────────────────

function GridLines() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />
      {/* radial fade to hide grid edges */}
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 80% 60% at 50% 50%, transparent 40%, #08080b 100%)" }} />
    </div>
  );
}

// ─── Orb ─────────────────────────────────────────────────────────────────────

function Orb({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <motion.div
      className={cn("pointer-events-none absolute rounded-full blur-3xl", className)}
      style={style}
      animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.7, 0.5] }}
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

// ─── Section fade-in wrapper ──────────────────────────────────────────────────

function FadeIn({
  children,
  delay = 0,
  className,
  direction = "up",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  direction?: "up" | "down" | "left" | "right" | "none";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  const dirs = {
    up: { y: 32, x: 0 },
    down: { y: -32, x: 0 },
    left: { x: 32, y: 0 },
    right: { x: -32, y: 0 },
    none: { x: 0, y: 0 },
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, ...dirs[direction] }}
      animate={inView ? { opacity: 1, x: 0, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Severity badge ───────────────────────────────────────────────────────────

function SeverityDot({ level }: { level: "critical" | "high" | "medium" | "low" }) {
  const colors = {
    critical: "bg-[var(--sev-critical)]",
    high: "bg-[var(--sev-high)]",
    medium: "bg-[var(--sev-medium)]",
    low: "bg-[var(--sev-low)]",
  };
  return <span className={cn("inline-block h-2 w-2 rounded-full", colors[level])} />;
}

// ─── Fake terminal / scan preview ─────────────────────────────────────────────

const LOG_LINES = [
  { text: "$ trivihub scan --image nginx:1.25", color: "var(--fg-muted)", delay: 0 },
  { text: "  Pulling image manifest…", color: "var(--fg-dim)", delay: 0.4 },
  { text: "  ✓ Image layers indexed (312 MB)", color: "var(--accent)", delay: 0.9 },
  { text: "  Scanning OS packages…", color: "var(--fg-dim)", delay: 1.3 },
  { text: "  Scanning language deps…", color: "var(--fg-dim)", delay: 1.7 },
  { text: "  ────────────────────────────────────", color: "var(--border-bright)", delay: 2.1 },
  { text: "  CRITICAL  CVE-2024-3094  libssl 3.0.1", color: "var(--sev-critical)", delay: 2.4 },
  { text: "  HIGH      CVE-2024-1234  zlib  1.2.11", color: "var(--sev-high)", delay: 2.7 },
  { text: "  HIGH      CVE-2023-5678  curl  7.88.1", color: "var(--sev-high)", delay: 3.0 },
  { text: "  MEDIUM    CVE-2023-9999  openssl …", color: "var(--sev-medium)", delay: 3.3 },
  { text: "  ────────────────────────────────────", color: "var(--border-bright)", delay: 3.6 },
  { text: "  Report saved → trivihub.io/r/abc123", color: "var(--accent)", delay: 3.9 },
];

function TerminalPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <div
      ref={ref}
      className="relative overflow-hidden rounded-2xl border border-[var(--border-bright)] bg-[var(--surface)]"
      style={{ boxShadow: "0 0 80px -20px oklch(0.86 0.18 130 / 0.12), 0 32px 64px -16px rgba(0,0,0,0.6)" }}
    >
      {/* Title bar */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-[var(--sev-critical)] opacity-80" />
        <span className="h-3 w-3 rounded-full bg-[var(--sev-high)] opacity-80" />
        <span className="h-3 w-3 rounded-full bg-[var(--accent)] opacity-80" />
        <span className="ml-3 font-mono text-xs text-[var(--fg-dim)]">trivihub — scan</span>
      </div>

      {/* Lines */}
      <div className="space-y-1 p-5 font-mono text-xs leading-relaxed">
        {LOG_LINES.map((line, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: line.delay, duration: 0.35, ease: "easeOut" }}
            style={{ color: line.color }}
          >
            {line.text}
          </motion.div>
        ))}
        {/* blinking cursor */}
        <motion.span
          className="inline-block h-4 w-[6px] rounded-sm bg-[var(--accent)]"
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse" }}
        />
      </div>
    </div>
  );
}

// ─── Bento card ───────────────────────────────────────────────────────────────

function BentoCard({
  children,
  className,
  glow = false,
}: {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6",
        className
      )}
      style={{
        boxShadow: hovered
          ? glow
            ? "0 0 40px -10px oklch(0.86 0.18 130 / 0.25), 0 16px 40px rgba(0,0,0,0.4)"
            : "0 16px 40px rgba(0,0,0,0.4)"
          : "0 4px 16px rgba(0,0,0,0.2)",
        transition: "box-shadow 0.3s ease",
      }}
    >
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-0 rounded-2xl"
            style={{ background: "radial-gradient(circle at 50% 0%, oklch(0.86 0.18 130 / 0.06), transparent 70%)" }}
          />
        )}
      </AnimatePresence>
      {children}
    </motion.div>
  );
}

// ─── Pill badge ───────────────────────────────────────────────────────────────

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--accent-dim)] bg-[oklch(0.86_0.18_130_/_0.08)] px-3 py-1 text-xs font-medium text-[var(--accent)]">
      {children}
    </span>
  );
}

// ─── Nav ─────────────────────────────────────────────────────────────────────

function Nav() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    return scrollY.on("change", (v) => setScrolled(v > 40));
  }, [scrollY]);

  return (
    <motion.nav
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 md:px-12"
      style={{
        background: scrolled ? "rgba(8,8,11,0.85)" : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.06)" : "1px solid transparent",
        transition: "background 0.4s ease, border-color 0.4s ease, backdrop-filter 0.4s ease",
      }}
    >
      <div className="flex items-center gap-2">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-label="Trivihub logo">
          <rect width="28" height="28" rx="7" fill="oklch(0.86 0.18 130 / 0.15)" />
          <path d="M7 10h14M14 7v14M10 17l4-6 4 6" stroke="oklch(0.86 0.18 130)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="font-semibold tracking-tight text-[var(--fg)]">Trivihub</span>
      </div>

      <div className="hidden items-center gap-8 text-sm text-[var(--fg-muted)] md:flex">
        {["Features", "How it works", "Pricing"].map((item) => (
          <a key={item} href={`#${item.toLowerCase().replace(/ /g, "-")}`} className="transition-colors hover:text-[var(--fg)]">
            {item}
          </a>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Link href="/login" className="text-sm text-[var(--fg-muted)] transition-colors hover:text-[var(--fg)]">
          Sign in
        </Link>
        <Link
          href="/register"
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[#0a0a0a] transition-all hover:brightness-110 active:scale-95"
        >
          Get started
        </Link>
      </div>
    </motion.nav>
  );
}

// ─── HERO ─────────────────────────────────────────────────────────────────────

function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  // Mouse parallax
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const orbX = useSpring(useTransform(mouseX, [0, 1], [-30, 30]), { stiffness: 40, damping: 30 });
  const orbY = useSpring(useTransform(mouseY, [0, 1], [-20, 20]), { stiffness: 40, damping: 30 });

  useEffect(() => {
    const move = (e: MouseEvent) => {
      mouseX.set(e.clientX / window.innerWidth);
      mouseY.set(e.clientY / window.innerHeight);
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, [mouseX, mouseY]);

  return (
    <section
      ref={containerRef}
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pt-24 pb-16"
      id="hero"
    >
      <GridLines />
      <NoiseOverlay />

      {/* Orbs */}
      <motion.div style={{ x: orbX, y: orbY }} className="pointer-events-none absolute inset-0">
        <Orb className="h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2" style={{ left: "30%", top: "35%", background: "oklch(0.86 0.18 130 / 0.12)" }} />
        <Orb className="h-[500px] w-[500px]" style={{ right: "10%", top: "20%", background: "oklch(0.68 0.22 285 / 0.10)" }} />
        <Orb className="h-[400px] w-[400px]" style={{ left: "10%", bottom: "5%", background: "oklch(0.65 0.24 22 / 0.07)" }} />
      </motion.div>

      <motion.div style={{ y, opacity }} className="relative z-10 mx-auto max-w-5xl text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mb-8 inline-flex"
        >
          <Pill>
            <motion.span
              className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            Now scanning 2M+ images daily
          </Pill>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mb-6 text-5xl font-bold leading-[1.06] tracking-[-0.03em] md:text-7xl"
        >
          <span className="text-[var(--fg)]">Vulnerability</span>
          <br />
          <span
            style={{
              background: "linear-gradient(135deg, oklch(0.86 0.18 130) 0%, oklch(0.78 0.20 160) 50%, oklch(0.68 0.22 285) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            intelligence
          </span>
          <span className="text-[var(--fg)]">, shipped.</span>
        </motion.h1>

        {/* Sub */}
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-[var(--fg-muted)]"
        >
          Trivihub aggregates Trivy scans across your entire CI/CD fleet into one real-time dashboard — so your team spots critical CVEs before they reach production.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35, ease: "easeOut" }}
          className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
        >
          <Link
            href="/register"
            className="group relative overflow-hidden rounded-xl bg-[var(--accent)] px-7 py-3.5 text-sm font-semibold text-[#0a0a0a] transition-all hover:brightness-110 active:scale-95"
          >
            <span className="relative z-10">Start for free</span>
            <motion.div
              className="absolute inset-0 -translate-x-full skew-x-12 bg-white/20"
              whileHover={{ translateX: "150%" }}
              transition={{ duration: 0.5 }}
            />
          </Link>
          <a
            href="#how-it-works"
            className="flex items-center gap-2 rounded-xl border border-[var(--border-strong)] px-7 py-3.5 text-sm font-medium text-[var(--fg-muted)] transition-all hover:border-[var(--border-bright)] hover:text-[var(--fg)]"
          >
            See how it works
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M7 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </a>
        </motion.div>

        {/* Social proof */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="mt-12 flex flex-col items-center gap-2"
        >
          <div className="flex -space-x-2">
            {["#4ade80", "#a78bfa", "#fb923c", "#60a5fa", "#f472b6"].map((c, i) => (
              <div key={i} className="h-8 w-8 rounded-full border-2 border-[var(--bg)]" style={{ background: c, opacity: 0.85 }} />
            ))}
          </div>
          <p className="text-xs text-[var(--fg-dim)]">Trusted by 500+ security teams</p>
        </motion.div>

        {/* Terminal preview */}
        <motion.div
          initial={{ opacity: 0, y: 48, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mt-16 text-left"
        >
          <TerminalPreview />
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="flex h-10 w-6 items-start justify-center rounded-full border border-[var(--border-bright)] pt-1.5"
        >
          <div className="h-2 w-1 rounded-full bg-[var(--fg-dim)]" />
        </motion.div>
      </motion.div>
    </section>
  );
}

// ─── STATS ────────────────────────────────────────────────────────────────────

const STATS = [
  { value: 2000000, suffix: "+", label: "Images scanned daily" },
  { value: 99, suffix: ".9%", label: "Uptime SLA" },
  { value: 180, suffix: "ms", label: "Avg scan ingest time" },
  { value: 47000, suffix: "+", label: "CVEs tracked" },
];

function Stats() {
  return (
    <section className="relative overflow-hidden border-y border-[var(--border)] bg-[var(--surface)] py-16">
      <NoiseOverlay />
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-px md:grid-cols-4">
        {STATS.map((s, i) => (
          <FadeIn key={s.label} delay={i * 0.1} className="flex flex-col items-center gap-1 px-6 py-8">
            <span className="text-4xl font-bold tabular-nums tracking-tight text-[var(--fg)] md:text-5xl">
              <Counter to={s.value} suffix={s.suffix} />
            </span>
            <span className="text-center text-sm text-[var(--fg-dim)]">{s.label}</span>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}

// ─── BENTO FEATURES ───────────────────────────────────────────────────────────

function VulnMiniTable() {
  const rows = [
    { cve: "CVE-2024-3094", pkg: "libssl", sev: "critical" as const, fixed: "3.0.2" },
    { cve: "CVE-2024-1234", pkg: "zlib", sev: "high" as const, fixed: "1.2.13" },
    { cve: "CVE-2023-5678", pkg: "curl", sev: "high" as const, fixed: "8.4.0" },
    { cve: "CVE-2023-9999", pkg: "openssl", sev: "medium" as const, fixed: "3.1.1" },
  ];
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });

  return (
    <div ref={ref} className="mt-4 overflow-hidden rounded-xl border border-[var(--border)] font-mono text-xs">
      <div className="grid grid-cols-4 border-b border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[var(--fg-dim)]">
        <span>CVE</span><span>Package</span><span>Severity</span><span>Fixed in</span>
      </div>
      {rows.map((row, i) => (
        <motion.div
          key={row.cve}
          initial={{ opacity: 0, x: -12 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ delay: 0.15 * i, duration: 0.4 }}
          className="grid grid-cols-4 border-b border-[var(--border)] px-3 py-2 last:border-0 hover:bg-[var(--surface-2)]"
        >
          <span className="text-[var(--fg-muted)] truncate">{row.cve}</span>
          <span className="text-[var(--fg)]">{row.pkg}</span>
          <span className="flex items-center gap-1">
            <SeverityDot level={row.sev} />
            <span className="capitalize" style={{ color: `var(--sev-${row.sev})` }}>{row.sev}</span>
          </span>
          <span className="text-[var(--accent)]">{row.fixed}</span>
        </motion.div>
      ))}
    </div>
  );
}

function MiniBarChart() {
  const bars = [
    { label: "Mon", crit: 3, high: 8 },
    { label: "Tue", crit: 1, high: 12 },
    { label: "Wed", crit: 5, high: 6 },
    { label: "Thu", crit: 2, high: 9 },
    { label: "Fri", crit: 0, high: 4 },
    { label: "Sat", crit: 1, high: 3 },
    { label: "Sun", crit: 4, high: 7 },
  ];
  const max = 20;
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });

  return (
    <div ref={ref} className="mt-4 flex items-end gap-2 h-24">
      {bars.map((b, i) => (
        <div key={b.label} className="flex flex-1 flex-col items-center gap-0.5">
          <div className="flex w-full flex-col gap-0.5">
            <motion.div
              className="w-full rounded-t-sm"
              initial={{ scaleY: 0 }}
              animate={inView ? { scaleY: 1 } : {}}
              transition={{ delay: i * 0.06, duration: 0.5, ease: "easeOut" }}
              style={{ height: `${(b.crit / max) * 60}px`, background: "var(--sev-critical)", transformOrigin: "bottom" }}
            />
            <motion.div
              className="w-full"
              initial={{ scaleY: 0 }}
              animate={inView ? { scaleY: 1 } : {}}
              transition={{ delay: i * 0.06 + 0.1, duration: 0.5, ease: "easeOut" }}
              style={{ height: `${(b.high / max) * 60}px`, background: "var(--sev-high)", transformOrigin: "bottom" }}
            />
          </div>
          <span className="text-[9px] text-[var(--fg-dim)]">{b.label}</span>
        </div>
      ))}
    </div>
  );
}

function IntegrationLogos() {
  const logos = [
    { label: "GitHub Actions", icon: "GH" },
    { label: "GitLab CI", icon: "GL" },
    { label: "Jenkins", icon: "JK" },
    { label: "CircleCI", icon: "CC" },
    { label: "Docker", icon: "DK" },
    { label: "Kubernetes", icon: "K8" },
  ];
  return (
    <div className="mt-4 grid grid-cols-3 gap-2">
      {logos.map((l, i) => (
        <FadeIn key={l.label} delay={0.08 * i} direction="none">
          <div className="flex flex-col items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] py-3 px-2 text-center transition-colors hover:border-[var(--border-bright)]">
            <span className="font-mono text-xs font-bold text-[var(--accent)]">{l.icon}</span>
            <span className="text-[9px] text-[var(--fg-dim)]">{l.label}</span>
          </div>
        </FadeIn>
      ))}
    </div>
  );
}

function Features() {
  return (
    <section className="relative overflow-hidden py-24 px-6" id="features">
      <div className="mx-auto max-w-6xl">
        <FadeIn className="mb-16 text-center">
          <Pill>Features</Pill>
          <h2 className="mt-4 text-4xl font-bold tracking-tight text-[var(--fg)] md:text-5xl">
            Everything your team needs<br />
            <span className="text-[var(--fg-muted)]">to stay ahead of threats</span>
          </h2>
        </FadeIn>

        {/* Bento grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:grid-rows-2">

          {/* Large card — vulnerability table */}
          <FadeIn delay={0} direction="up" className="md:col-span-2 md:row-span-1">
            <BentoCard glow className="h-full">
              <p className="text-xs font-medium uppercase tracking-widest text-[var(--accent)]">Real-time scanning</p>
              <h3 className="mt-2 text-xl font-semibold text-[var(--fg)]">CVEs, ranked by impact</h3>
              <p className="mt-1 text-sm text-[var(--fg-muted)]">Triage faster with severity-ordered results and direct fix versions — no noise.</p>
              <VulnMiniTable />
            </BentoCard>
          </FadeIn>

          {/* Small card — notifications */}
          <FadeIn delay={0.1} direction="left" className="md:col-span-1 md:row-span-1">
            <BentoCard className="h-full">
              <p className="text-xs font-medium uppercase tracking-widest text-[var(--violet)]">Alerting</p>
              <h3 className="mt-2 text-xl font-semibold text-[var(--fg)]">Instant alerts</h3>
              <p className="mt-1 text-sm text-[var(--fg-muted)]">Slack, email, or webhook — get notified the moment a critical CVE lands in your stack.</p>
              <div className="mt-4 space-y-2">
                {[
                  { msg: "🔴 CRITICAL detected in api-service:latest", time: "2s ago" },
                  { msg: "🟠 2 HIGH in frontend:v1.8.3", time: "1m ago" },
                  { msg: "✅ All clear: worker:v2.1.0", time: "5m ago" },
                ].map((n, i) => (
                  <FadeIn key={i} delay={0.2 + i * 0.1} direction="right">
                    <div className="flex items-start justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
                      <span className="text-xs text-[var(--fg-muted)]">{n.msg}</span>
                      <span className="shrink-0 text-[10px] text-[var(--fg-dim)]">{n.time}</span>
                    </div>
                  </FadeIn>
                ))}
              </div>
            </BentoCard>
          </FadeIn>

          {/* Small card — trend chart */}
          <FadeIn delay={0.15} direction="up" className="md:col-span-1 md:row-span-1">
            <BentoCard className="h-full">
              <p className="text-xs font-medium uppercase tracking-widest text-[var(--sev-high)]">Analytics</p>
              <h3 className="mt-2 text-xl font-semibold text-[var(--fg)]">Trend analysis</h3>
              <p className="mt-1 text-sm text-[var(--fg-muted)]">Weekly breakdown of critical and high-severity findings across all projects.</p>
              <MiniBarChart />
              <div className="mt-3 flex gap-4 text-xs text-[var(--fg-dim)]">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm" style={{ background: "var(--sev-critical)" }} />Critical</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm" style={{ background: "var(--sev-high)" }} />High</span>
              </div>
            </BentoCard>
          </FadeIn>

          {/* Large card — integrations */}
          <FadeIn delay={0.2} direction="right" className="md:col-span-2 md:row-span-1">
            <BentoCard className="h-full">
              <p className="text-xs font-medium uppercase tracking-widest text-[var(--fg-muted)]">Integrations</p>
              <h3 className="mt-2 text-xl font-semibold text-[var(--fg)]">Plugs into your CI/CD in minutes</h3>
              <p className="mt-1 text-sm text-[var(--fg-muted)]">One-line integration with your existing pipelines — no agents, no infra changes.</p>
              <IntegrationLogos />
            </BentoCard>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

// ─── HOW IT WORKS ─────────────────────────────────────────────────────────────

const STEPS = [
  {
    n: "01",
    title: "Connect your pipeline",
    body: "Add a single curl command or GitHub Action to your CI job. Trivihub receives scan results over a secure webhook.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 10a7 7 0 1014 0A7 7 0 003 10zm7-3v3l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
    ),
  },
  {
    n: "02",
    title: "Trivy scans your images",
    body: "Trivy runs inside your pipeline and forwards structured JSON results to Trivihub — no data leaves your environment unencrypted.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 3l7 4v6l-7 4-7-4V7l7-4z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
    ),
  },
  {
    n: "03",
    title: "Dashboard updates instantly",
    body: "Your team sees new CVEs within seconds of a pipeline run. Filter by project, severity, registry, or date.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="3" y="3" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" /><rect x="11" y="3" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" /><rect x="3" y="11" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" /><rect x="11" y="11" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" /></svg>
    ),
  },
  {
    n: "04",
    title: "Alert & remediate",
    body: "Receive targeted alerts per project. One click shows the exact package, fix version, and affected images.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 2l1.8 5.5H17l-4.5 3.3 1.7 5.2L10 13l-4.2 3 1.7-5.2L3 7.5h5.2L10 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>
    ),
  },
];

function HowItWorks() {
  return (
    <section className="relative overflow-hidden border-t border-[var(--border)] py-24 px-6" id="how-it-works">
      <Orb className="h-[600px] w-[600px] -translate-x-1/2" style={{ left: "80%", top: "50%", background: "oklch(0.68 0.22 285 / 0.07)" }} />
      <div className="relative mx-auto max-w-5xl">
        <FadeIn className="mb-16 text-center">
          <Pill>How it works</Pill>
          <h2 className="mt-4 text-4xl font-bold tracking-tight text-[var(--fg)] md:text-5xl">
            Up and running<br />
            <span className="text-[var(--fg-muted)]">in under five minutes</span>
          </h2>
        </FadeIn>

        <div className="relative grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* connector line */}
          <div className="pointer-events-none absolute top-10 left-0 right-0 hidden h-px lg:block" style={{ background: "linear-gradient(90deg, transparent, var(--border-bright) 20%, var(--border-bright) 80%, transparent)" }} />

          {STEPS.map((step, i) => (
            <FadeIn key={step.n} delay={i * 0.12} direction="up">
              <div className="relative flex flex-col gap-4">
                <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-[var(--border-bright)] bg-[var(--surface)]">
                  <span className="absolute -top-3 -right-3 flex h-6 w-6 items-center justify-center rounded-full border border-[var(--accent-dim)] bg-[var(--bg)] text-[10px] font-bold text-[var(--accent)]">
                    {i + 1}
                  </span>
                  <span className="text-[var(--fg-muted)]">{step.icon}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--fg)]">{step.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--fg-muted)]">{step.body}</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>

        {/* Code snippet */}
        <FadeIn delay={0.3} className="mt-16">
          <div className="overflow-hidden rounded-2xl border border-[var(--border-bright)] bg-[var(--surface)]">
            <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--surface-2)] px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--border-bright)]" />
              <span className="font-mono text-xs text-[var(--fg-dim)]">.github/workflows/scan.yml</span>
            </div>
            <pre className="overflow-x-auto p-5 font-mono text-xs leading-loose" style={{ color: "var(--fg-muted)" }}>
              <span style={{ color: "var(--fg-dim)" }}>- name: </span><span style={{ color: "var(--accent)" }}>Trivihub scan{"\n"}</span>
              {"  "}<span style={{ color: "var(--fg-dim)" }}>uses: </span><span style={{ color: "var(--fg)" }}>trivihub/scan-action@v2{"\n"}</span>
              {"  "}<span style={{ color: "var(--fg-dim)" }}>with:{"\n"}</span>
              {"    "}<span style={{ color: "var(--fg-dim)" }}>api-key: </span><span style={{ color: "var(--violet)" }}>${"{{ secrets.TRIVIHUB_KEY }}"}{"\n"}</span>
              {"    "}<span style={{ color: "var(--fg-dim)" }}>image: </span><span style={{ color: "var(--fg)" }}>{"${{ env.IMAGE_TAG }}"}</span>
            </pre>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ─── CTA ──────────────────────────────────────────────────────────────────────

function CTA() {
  return (
    <section className="relative overflow-hidden border-t border-[var(--border)] py-32 px-6">
      <NoiseOverlay />
      <Orb className="h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2" style={{ left: "50%", top: "50%", background: "oklch(0.86 0.18 130 / 0.07)" }} />

      <div className="relative mx-auto max-w-3xl text-center">
        <FadeIn>
          <h2 className="text-4xl font-bold tracking-tight text-[var(--fg)] md:text-6xl">
            Ship secure,<br />
            <span
              style={{
                background: "linear-gradient(135deg, oklch(0.86 0.18 130), oklch(0.68 0.22 285))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              every time.
            </span>
          </h2>
          <p className="mx-auto mt-6 max-w-lg text-lg text-[var(--fg-muted)]">
            Join 500+ security-conscious teams who use Trivihub to catch CVEs before they reach production.
          </p>

          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/register"
              className="rounded-xl bg-[var(--accent)] px-8 py-4 text-sm font-semibold text-[#0a0a0a] transition-all hover:brightness-110 active:scale-95"
            >
              Get started for free
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-[var(--border-strong)] px-8 py-4 text-sm font-medium text-[var(--fg-muted)] transition-all hover:border-[var(--border-bright)] hover:text-[var(--fg)]"
            >
              Sign in to dashboard
            </Link>
          </div>

          <p className="mt-6 text-xs text-[var(--fg-dim)]">No credit card required · Free tier forever · SOC 2 Type II in progress</p>
        </FadeIn>
      </div>
    </section>
  );
}

// ─── FOOTER ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-[var(--border)] px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-xs text-[var(--fg-dim)] sm:flex-row">
        <span className="font-semibold text-[var(--fg-muted)]">Trivihub</span>
        <span>© {new Date().getFullYear()} Trivihub. Built on Trivy OSS.</span>
        <div className="flex gap-6">
          {["Privacy", "Terms", "Status"].map((l) => (
            <a key={l} href="#" className="transition-colors hover:text-[var(--fg-muted)]">{l}</a>
          ))}
        </div>
      </div>
    </footer>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg)", color: "var(--fg)", fontFamily: "var(--font-sans)" }}>
      <Nav />
      <main>
        <Hero />
        <Stats />
        <Features />
        <HowItWorks />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
