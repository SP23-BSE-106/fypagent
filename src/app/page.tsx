"use client";

import * as React from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import {
  Sparkles,
  GitBranch,
  Terminal,
  Shield,
  Zap,
  Check,
  ArrowRight,
  ChevronRight,
  Circle,
} from "lucide-react";

import { PublicLayout } from "@/components/layout/PublicLayout";
import { ThreeBackground } from "@/components/ui/ThreeBackground";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

// Lazy‑load the heavy Three.js canvas so it never SSR-crashes
const ThreeBackgroundSafe = dynamic(
  () => import("@/components/ui/ThreeBackground").then((m) => m.ThreeBackground),
  { ssr: false }
);

// ─── tiny helpers ─────────────────────────────────────────────────────────────
const FadeUp = ({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) => {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// ─── BENTO CARD ──────────────────────────────────────────────────────────────
const BentoCard = ({
  children,
  className,
  glow = false,
}: {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}) => (
  <div
    className={cn(
      "group relative overflow-hidden rounded-2xl border border-white/5 bg-[#0d1520]/80 backdrop-blur-xl transition-all duration-500",
      "hover:border-accent/30 hover:shadow-[0_0_40px_-10px_rgba(91,231,196,0.2)]",
      glow && "border-accent/20 shadow-[0_0_30px_-10px_rgba(91,231,196,0.15)]",
      className
    )}
  >
    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
    {children}
  </div>
);

// ─── NODE CARD ───────────────────────────────────────────────────────────────
const NodeCard = ({
  label,
  type,
  active,
  style,
}: {
  label: string;
  type: string;
  active?: boolean;
  style?: React.CSSProperties;
}) => (
  <motion.div
    animate={{ y: [0, -6, 0] }}
    transition={{
      duration: 4,
      repeat: Infinity,
      ease: "easeInOut",
    }}
    style={style}
    className={cn(
      "absolute select-none rounded-xl border bg-[#131A23]/90 backdrop-blur-md p-3 w-44 shadow-2xl",
      active ? "border-accent/50 shadow-accent/10" : "border-white/8"
    )}
  >
    <div className="flex items-center gap-2 mb-1.5">
      <div
        className={cn(
          "h-5 w-5 rounded flex items-center justify-center text-[9px] font-black",
          active ? "bg-accent/20 text-accent" : "bg-white/5 text-white/40"
        )}
      >
        {type.slice(0, 2).toUpperCase()}
      </div>
      <span className="text-[11px] font-bold text-white/90 leading-none">{label}</span>
      {active && (
        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
      )}
    </div>
    <p className="text-[9px] text-white/35 leading-relaxed">{type}</p>
  </motion.div>
);

const PageCursorGlow = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = React.useState<{ x: number; y: number; show: boolean }>({
    x: 50,
    y: 50,
    show: false,
  });

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const mql = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const reduced = mql?.matches ?? false;

    if (reduced) return;

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setPos({ x, y, show: true });
    };

    const onLeave = () => setPos((g) => ({ ...g, show: false }));

    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);

    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-300"
        style={{
          opacity: pos.show ? 1 : 0,
          background: `radial-gradient(circle at ${pos.x}% ${pos.y}%, rgba(91,231,196,0.10), rgba(91,231,196,0.0) 55%)`,
        }}
      />
      {children}
    </div>
  );
};

// ─── Pricing tier card with cursor-follow glow ────────────────────────────────
const PricingTierCard = ({
  tier,
  children,
}: {
  tier: {
    name: string;
    price: string;
    highlight: boolean;
    features: string[];
  };
  children: React.ReactNode;
}) => {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [glow, setGlow] = React.useState<{ x: number; y: number; show: boolean }>(
    { x: 50, y: 50, show: false }
  );

  return (
    <div
      ref={ref}
      className={cn(
        "group relative flex flex-col h-full rounded-2xl border p-7 transition-all duration-300 overflow-hidden",
        tier.highlight
          ? "border-accent/40 bg-gradient-to-b from-accent/5 to-transparent shadow-[0_0_40px_-10px_rgba(91,231,196,0.2)]"
          : "border-white/8 bg-[#0d1520]/60"
      )}
      onMouseMove={(e) => {
        const el = ref.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setGlow({ x, y, show: true });
      }}
      onMouseLeave={() => setGlow((g) => ({ ...g, show: false }))}
    >
      {/* cursor-follow glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200"
        style={{
          opacity: glow.show ? 1 : 0,
          background: `radial-gradient(circle at ${glow.x}% ${glow.y}%, rgba(91,231,196,0.35), rgba(91,231,196,0.0) 60%)`,
        }}
      />

      {tier.highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-1 text-[9px] font-black uppercase tracking-widest text-[#060b10]">
          Most Popular
        </div>
      )}

      <div className="flex flex-col h-full">
        {children}
      </div>
    </div>
  );
};

// ─── DATA FLOWS (SVG connector lines between nodes) ──────────────────────────
const FlowLine = ({
  x1,
  y1,
  x2,
  y2,
  active,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  active?: boolean;
}) => (
  <motion.line
    x1={x1}
    y1={y1}
    x2={x2}
    y2={y2}
    stroke={active ? "#5BE7C4" : "#1E293B"}
    strokeWidth={active ? 1.5 : 1}
    strokeDasharray="4 4"
    initial={{ pathLength: 0, opacity: 0 }}
    animate={{ pathLength: 1, opacity: 1 }}
    transition={{ duration: 1.5, delay: 0.5, ease: "easeInOut" }}
  />
);

export default function LandingPage() {
  const { scrollYProgress } = useScroll();

  const heroY = useTransform(scrollYProgress, [0, 0.18], [0, 120]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.16], [1, 0]);

  // StoryRail motion (sticky)
  const railTranslateY = useTransform(scrollYProgress, [0, 1], [0, -280]);
  const railGlowOpacity = useTransform(scrollYProgress, [0.05, 0.35], [0.15, 0]);
  const railTilt = useTransform(scrollYProgress, [0, 1], [0, -6]);

  const stats = [
    { label: "Agent Executions", value: "48.3K" },
    { label: "Avg Response", value: "1.94s" },
    { label: "Token Accuracy", value: "99.8%" },
    { label: "LLM Providers", value: "8+" },
  ];

  const features = [
    {
      icon: GitBranch,
      title: "Visual Node Canvas",
      desc: "Drag‑and‑drop multi‑agent logic with React Flow. Connect LLMs, APIs, memory, and RAG stores in seconds.",
      span: "col-span-2",
    },
    {
      icon: Sparkles,
      title: "Vibe Coding",
      desc: "Describe your agent team in plain English. Our synthesis engine compiles structured workflows automatically.",
      span: "col-span-1",
    },
    {
      icon: Terminal,
      title: "Live Sandbox",
      desc: "Run, trace, and debug in real‑time with synchronized execution logs.",
      span: "col-span-1",
    },
    {
      icon: Zap,
      title: "One‑Click Deploy",
      desc: "Ship as a REST endpoint, floating chat widget, or public shareable link.",
      span: "col-span-1",
    },
    {
      icon: Shield,
      title: "Secure Guardrails",
      desc: "Token budgets, rate limits, and content policies baked in.",
      span: "col-span-1",
    },
  ];

  const pricing = [
    {
      name: "Developer",
      price: "$0",
      highlight: false,
      features: [
        "3 active agent flows",
        "100 MB RAG storage",
        "Shared API sandbox",
        "Community support",
      ],
    },
    {
      name: "Pro",
      price: "$49",
      highlight: true,
      features: [
        "Unlimited workflows",
        "5 GB document DB",
        "Custom domain widget",
        "Dedicated API keys",
        "Priority support",
      ],
    },
    {
      name: "Enterprise",
      price: "Custom",
      highlight: false,
      features: [
        "Self‑hosted option",
        "Unlimited storage",
        "Custom SSO & IAM",
        "99.9% SLA",
        "Dedicated architect",
      ],
    },
  ];

  return (
    <PublicLayout>
      <PageCursorGlow className="relative">
        <div className="relative">
          {/* Full-landing 3D background so the look stays consistent */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <ThreeBackgroundSafe className="absolute inset-0 opacity-100" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_10%,rgba(91,231,196,0.10),transparent_55%),radial-gradient(circle_at_90%_40%,rgba(91,231,196,0.06),transparent_45%),linear-gradient(to_bottom,rgba(11,15,20,0.0),rgba(11,15,20,0.75)_70%,rgba(11,15,20,1))]" />
        </div>

        {/* StoryRail */}
        <div className="hidden lg:block pointer-events-none fixed left-0 top-0 h-screen w-[44%] z-[40]">
          <motion.div
            style={{ translateY: railTranslateY, opacity: railGlowOpacity, rotateY: railTilt }}
            className="absolute inset-0 origin-bottom-left"
          >
            <div className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-accent/10 via-transparent to-transparent blur-[0px]" />
            <div className="absolute left-10 top-24 h-[1px] w-14 bg-gradient-to-r from-accent/60 to-transparent" />
            <div className="absolute left-10 top-24 flex flex-col gap-4">
              {[
                { n: "01", t: "Build" },
                { n: "02", t: "Compose" },
                { n: "03", t: "Deploy" },
                { n: "04", t: "Scale" },
              ].map((s) => (
                <div key={s.n} className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full border border-white/10 bg-surface/20 flex items-center justify-center text-[10px] font-black text-accent">
                    {s.n}
                  </div>
                  <div className="text-[11px] font-bold uppercase tracking-widest text-white/35">
                    {s.t}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* HERO */}
        <section className="relative min-h-screen flex overflow-hidden bg-background">
          {/* left */}
          <div className="relative z-10 flex flex-col justify-center w-full lg:w-[52%] px-8 sm:px-14 lg:pl-20 lg:pr-12 py-28 lg:py-0 bg-background">
            <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(to_right,rgba(255,255,255,0.5)_1px,transparent_1px)] [background-size:40px_40px]" />
            <div className="pointer-events-none absolute -top-20 -left-20 w-96 h-96 rounded-full bg-accent/5 blur-[120px]" />

            <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-accent/25 bg-accent/8 px-4 py-1.5"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-accent">
                  Multi-Agent Orchestration Platform
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.85, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="text-5xl sm:text-6xl xl:text-7xl font-black tracking-tighter leading-[0.95] mb-6"
              >
                <span className="block text-white">Build Agent</span>
                <span className="block bg-gradient-to-r from-accent via-emerald-300 to-cyan-400 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(91,231,196,0.4)]">
                  Workflows
                </span>
                <span className="block text-white">Visually.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.75, delay: 0.4 }}
                className="text-white/50 text-base sm:text-lg leading-relaxed mb-10 max-w-lg font-light"
              >
                Connect LLMs, RAG stores, APIs, and memory on a reactive canvas.
                Design once — deploy anywhere with a single click.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.55 }}
                className="flex flex-wrap items-center gap-4"
              >
                <Link href="/signup">
                  <button className="group inline-flex h-12 items-center gap-2.5 rounded-full bg-accent px-7 text-sm font-bold text-[#060b10] shadow-[0_0_30px_rgba(91,231,196,0.35)] transition-all duration-300 hover:shadow-[0_0_50px_rgba(91,231,196,0.6)] hover:scale-[1.03] active:scale-[0.97] relative overflow-hidden">
                    <span
                      aria-hidden
                      className="pointer-events-none absolute -left-10 top-0 h-full w-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{
                        background:
                          "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.55) 45%, rgba(255,255,255,0) 100%)",
                        transform: "skewX(-18deg)",
                      }}
                    />
                    Start Building Free
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 relative z-10" />
                  </button>
                </Link>

                <Link href="/workflow-builder">
                  <button className="inline-flex h-12 items-center gap-2 rounded-full border border-white/12 bg-white/4 px-7 text-sm font-semibold text-white/75 transition-all duration-300 hover:border-white/25 hover:bg-white/8 hover:text-white relative overflow-hidden group">
                    <span
                      aria-hidden
                      className="pointer-events-none absolute -left-10 top-0 h-full w-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{
                        background:
                          "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(91,231,196,0.55) 45%, rgba(255,255,255,0) 100%)",
                        transform: "skewX(-18deg)",
                      }}
                    />
                    <span className="h-2 w-2 rounded-full bg-accent animate-pulse relative z-10" />
                    <span className="relative z-10">Live Demo</span>
                  </button>
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9, duration: 0.8 }}
                className="mt-14 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-6"
              >
                {stats.map((s) => (
                  <div key={s.label}>
                    <div className="text-2xl font-black text-white tabular-nums">{s.value}</div>
                    <div className="text-[10px] font-semibold uppercase tracking-widest text-white/30 mt-1">
                      {s.label}
                    </div>
                  </div>
                ))}
              </motion.div>
            </motion.div>
          </div>

          {/* right */}
          <div className="hidden lg:block absolute right-0 top-0 w-[52%] h-full z-0">
            <div className="absolute inset-0 bg-transparent" />
            {/* particle accents already come from the global background */}
            <div className="pointer-events-none absolute inset-0 opacity-[0.012] [background:repeating-linear-gradient(0deg,transparent,transparent_2px,#fff_2px,#fff_3px)]" />

            <div className="pointer-events-none relative w-full h-full">
              <svg className="absolute inset-0 w-full h-full" style={{ overflow: "visible" }}>
                <FlowLine x1={240} y1={230} x2={150} y2={310} active />
                <FlowLine x1={240} y1={230} x2={330} y2={320} />
                <FlowLine x1={150} y1={360} x2={240} y2={440} active />
                <FlowLine x1={330} y1={370} x2={240} y2={440} />
              </svg>

              <NodeCard label="Webhook Ingestion" type="Input trigger" style={{ top: "20%", left: "35%" }} />
              <NodeCard
                label="Model Router"
                type="LLM Node · GPT‑4o"
                active
                style={{ top: "40%", left: "14%" }}
              />
              <NodeCard label="RAG Retrieval" type="Vector search" style={{ top: "40%", left: "54%" }} />
              <NodeCard
                label="Response Output"
                type="Compiled result"
                active
                style={{ top: "61%", left: "35%" }}
              />
            </div>
          </div>

          {/* bottom fade */}
          <div className="pointer-events-none absolute bottom-0 inset-x-0 h-28 z-30 bg-gradient-to-t from-[var(--background)] to-transparent" />
        </section>

        {/* LOGO STRIP */}
        <div className="border-y border-white/5 bg-background py-5 overflow-hidden">
          <div className="flex gap-12 animate-[marquee_28s_linear_infinite] whitespace-nowrap">
            {[
              "OpenAI",
              "Anthropic",
              "Mistral",
              "DeepSeek",
              "Ollama",
              "LangChain",
              "Pinecone",
              "Weaviate",
              "OpenAI",
              "Anthropic",
              "Mistral",
              "DeepSeek",
              "Ollama",
              "LangChain",
              "Pinecone",
              "Weaviate",
            ].map((name, i) => (
              <span
                key={`${name}-${i}`}
                className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-white/20"
              >
                <Circle className="h-1 w-1 fill-accent text-accent" />
                {name}
              </span>
            ))}
          </div>
        </div>

        {/* FEATURES */}
        <section className="relative bg-background py-28 px-4 sm:px-6">
          <div className="pointer-events-none absolute inset-0 opacity-[0.025] [background-image:linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(to_right,rgba(255,255,255,0.5)_1px,transparent_1px)] [background-size:60px_60px]" />

          <div className="mx-auto max-w-6xl relative z-10">
            <FadeUp className="text-center mb-16">
              <p className="text-[11px] font-bold uppercase tracking-widest text-accent mb-4">Capabilities</p>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white/95 tracking-tighter leading-tight">
                Everything you need to<br className="hidden md:block" /> orchestrate production AI teams
              </h2>
            </FadeUp>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[260px]">
              {features.map((f, idx) => {
                if (idx === 0) {
                  return (
                    <FadeUp key={f.title} delay={0.05} className="md:col-span-2">
                      <BentoCard glow className="h-full p-8 flex flex-col justify-between">
                        <div>
                          <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent mb-5">
                            <GitBranch className="h-5 w-5" />
                          </div>
                          <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
                          <p className="text-sm text-white/40 leading-relaxed max-w-sm">{f.desc}</p>
                        </div>
                        <div className="relative h-20 rounded-lg bg-black/30 border border-white/5 overflow-hidden mt-4">
                          <div className="absolute inset-0 flex items-center px-4 gap-3">
                            {["IN", "LLM", "RAG", "OUT"].map((t, i) => (
                              <React.Fragment key={t}>
                                <div className="rounded bg-[#131A23] border border-accent/20 px-2 py-1 text-[9px] font-bold text-accent whitespace-nowrap">
                                  {t}
                                </div>
                                {i < 3 && <div className="flex-1 h-px border-t border-dashed border-accent/20" />}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      </BentoCard>
                    </FadeUp>
                  );
                }

                return (
                  <FadeUp
                    key={f.title}
                    delay={0.05 + idx * 0.05}
                    className={f.span === "col-span-1" ? "" : undefined}
                  >
                    <BentoCard className="h-full p-8 flex flex-col justify-between">
                      <div>
                        <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent mb-5">
                          {React.createElement(f.icon, { className: "h-5 w-5" })}
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
                        <p className="text-sm text-white/40 leading-relaxed">{f.desc}</p>
                      </div>
                    </BentoCard>
                  </FadeUp>
                );
              })}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="bg-background py-28 px-4 sm:px-6">
          <div className="mx-auto max-w-5xl relative z-10">
            <FadeUp className="text-center mb-20">
              <p className="text-[11px] font-bold uppercase tracking-widest text-accent mb-4">How it works</p>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white/95 tracking-tighter">
                From prompt to production<br className="hidden md:block" /> in three steps
              </h2>
            </FadeUp>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  n: "01",
                  title: "Design on Canvas",
                  body: "Open the visual builder and wire up agents, LLMs, RAG nodes, and API actions in a drag-and-drop canvas.",
                },
                {
                  n: "02",
                  title: "Test in Sandbox",
                  body: "Chat with your workflow live. Each message replays the full execution trace so you see exactly what each node does.",
                },
                {
                  n: "03",
                  title: "Deploy Anywhere",
                  body: "Copy a widget script, hit an REST endpoint, or share a public link. Your agents run 24/7 on our managed infra.",
                },
              ].map((step, i) => (
                <FadeUp key={step.n} delay={i * 0.12}>
                  <div className="relative">
                    <div className="text-[80px] font-black leading-none text-white/[0.03] select-none absolute -top-6 -left-2">
                      {step.n}
                    </div>
                    <div className="relative pt-4">
                      <div className="h-8 w-8 rounded-full border border-accent/30 flex items-center justify-center text-[11px] font-bold text-accent mb-5">
                        {step.n}
                      </div>
                      <h3 className="text-lg font-bold text-white mb-3">{step.title}</h3>
                      <p className="text-sm text-white/40 leading-relaxed">{step.body}</p>
                    </div>
                    {i < 2 && (
                      <ChevronRight className="hidden md:block absolute top-10 -right-5 h-5 w-5 text-white/10" />
                    )}
                  </div>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>

        {/* TEMPLATES */}
        <section className="relative bg-background py-28 px-4 sm:px-6">
          <div className="pointer-events-none absolute inset-0 opacity-[0.025] [background-image:linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(to_right,rgba(255,255,255,0.5)_1px,transparent_1px)] [background-size:60px_60px]" />

          <div className="mx-auto max-w-6xl relative z-10">
            <FadeUp className="text-center mb-16">
              <p className="text-[11px] font-bold uppercase tracking-widest text-accent mb-4">Templates</p>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white/95 tracking-tighter">
                Start from proven agent designs
              </h2>
              <p className="text-white/40 mt-4 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed">
                Deploy a pre-built workflow in minutes—then customize the logic in Canvas.
              </p>
            </FadeUp>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  name: "Customer Support Escalator",
                  category: "Customer Service",
                  desc: "Semantic search over support docs + drafted responses + human escalation.",
                },
                {
                  name: "SaaS Lead Enricher",
                  category: "Marketing Automation",
                  desc: "Enrich profiles on signup, score intent, and generate personalized onboarding.",
                },
                {
                  name: "GitHub Reviewer & SecOps",
                  category: "Developer Tools",
                  desc: "Detect secrets + security issues and generate PR line comments.",
                },
                {
                  name: "RAG Contract Q&A",
                  category: "Legal & Compliance",
                  desc: "Citations-ready answers with clause risk highlighting for review.",
                },
                {
                  name: "Incident Postmortem Writer",
                  category: "DevOps",
                  desc: "Summarize timelines and generate blame-free action items.",
                },
                {
                  name: "Product Feedback Triage",
                  category: "Growth",
                  desc: "Cluster feedback, label issues with LLMs, and draft acceptance criteria.",
                },
              ].map((t, idx) => (
                <FadeUp key={t.name} delay={0.05 + idx * 0.05}>
                  <BentoCard className="h-full p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-4 mb-4">
                        <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent border border-accent/20">
                          <span className="text-[10px] font-black">{t.category.split(" ")[0].slice(0, 2).toUpperCase()}</span>
                        </div>
                        <span className="text-[9px] font-bold uppercase tracking-widest text-white/35">{t.category}</span>
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2">{t.name}</h3>
                      <p className="text-sm text-white/40 leading-relaxed">{t.desc}</p>
                    </div>

                    <div className="mt-6">
                      <Link href="/dashboard/templates">
                        <button className="inline-flex items-center gap-2 text-sm font-bold text-accent hover:underline underline-offset-4 transition-colors">
                          View Marketplace <ChevronRight className="h-4 w-4" />
                        </button>
                      </Link>
                    </div>
                  </BentoCard>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section className="relative bg-[#060b10] py-28 px-4 sm:px-6 overflow-hidden">
          <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-[600px] w-[600px] rounded-full bg-accent/3 blur-[140px]" />
          <div className="mx-auto max-w-5xl relative z-10">
            <FadeUp className="text-center mb-16">
              <p className="text-[11px] font-bold uppercase tracking-widest text-accent mb-4">Pricing</p>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white/95 tracking-tighter">
                Simple, transparent plans
              </h2>
            </FadeUp>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
              {pricing.map((tier) => (
                <FadeUp key={tier.name} delay={0.1}>
                  <PricingTierCard tier={tier}>
                    <div className="mb-6 relative z-10">
                      <h3 className="text-sm font-bold text-white/70 uppercase tracking-widest mb-4">
                        {tier.name}
                      </h3>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black text-white">{tier.price}</span>
                        {tier.price !== "Custom" && (
                          <span className="text-white/30 text-sm">/mo</span>
                        )}
                      </div>
                    </div>

                    <ul className="space-y-3 flex-1 relative z-10 transition-all duration-300 group-hover:translate-y-[-4px] group-hover:opacity-100" >
                      {tier.features.map((f) => (
                        <li
                          key={f}
                          className="flex items-center gap-2.5 text-sm text-white/55"
                        >
                          <Check className="h-3.5 w-3.5 text-accent flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>

                    <Link href="/signup" className="mt-8 block relative z-10">
                      <button
                        className={cn(
                          "w-full rounded-xl py-3 text-sm font-bold transition-all duration-200 relative overflow-hidden group",
                          tier.highlight
                            ? "bg-accent text-[#060b10] shadow-[0_0_20px_rgba(91,231,196,0.3)] hover:shadow-[0_0_35px_rgba(91,231,196,0.45)]"
                            : "border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        <span
                          aria-hidden
                          className="pointer-events-none absolute -left-10 top-0 h-full w-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                          style={{
                            background:
                              "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.55) 45%, rgba(255,255,255,0) 100%)",
                            transform: "skewX(-18deg)",
                          }}
                        />
                        <span className="relative z-10">
                          {tier.price === "Custom" ? "Contact Sales" : "Get Started"}
                        </span>
                      </button>
                    </Link>
                  </PricingTierCard>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>

        {/* BOTTOM CTA */}
        <section className="relative bg-[#060b10] py-28 px-4 sm:px-6 overflow-hidden">
          <div className="pointer-events-none absolute inset-0 [background-image:radial-gradient(ellipse_60%_50%_at_50%_50%,rgba(91,231,196,0.06),transparent)]" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.02] [background-image:linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(to_right,rgba(255,255,255,0.5)_1px,transparent_1px)] [background-size:60px_60px]" />

          <FadeUp className="mx-auto max-w-3xl text-center relative z-10">
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter text-white/95 mb-6 leading-tight">
              Ready to build your<br />
              <span className="bg-gradient-to-r from-accent via-emerald-300 to-cyan-400 bg-clip-text text-transparent">
                first agent system?
              </span>
            </h2>

            <p className="text-white/40 text-base sm:text-lg mb-10 max-w-xl mx-auto leading-relaxed">
              Join teams using AgentFlow to deploy reliable, production-grade multi-agent pipelines in hours, not weeks.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/signup">
                <button className="inline-flex h-13 items-center gap-2.5 rounded-full bg-accent px-8 text-sm font-bold text-[#060b10] shadow-[0_0_30px_rgba(91,231,196,0.35)] transition-all duration-300 hover:shadow-[0_0_50px_rgba(91,231,196,0.55)] hover:scale-[1.03] active:scale-[0.97] relative overflow-hidden group">
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -left-10 top-0 h-full w-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background:
                        "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.55) 45%, rgba(255,255,255,0) 100%)",
                      transform: "skewX(-18deg)",
                    }}
                  />
                  <span className="relative z-10 flex items-center gap-2 whitespace-nowrap">
                    <span>Start for Free</span>
                    <ArrowRight className="h-4 w-4 relative z-10" />
                  </span>
                </button>
              </Link>

              <Link href="/docs">
                <button className="inline-flex h-13 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-8 text-sm font-semibold text-white/70 backdrop-blur-sm transition-all duration-200 hover:border-white/20 hover:text-white relative overflow-hidden group">
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -left-10 top-0 h-full w-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background:
                        "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(91,231,196,0.55) 45%, rgba(255,255,255,0) 100%)",
                      transform: "skewX(-18deg)",
                    }}
                  />
                  <span className="relative z-10">Read the Docs</span>
                </button>
              </Link>
            </div>
          </FadeUp>
        </section>

        <style>{`
          @keyframes marquee {
            0%   { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
        `}</style>
        </div>
      </PageCursorGlow>
    </PublicLayout>
  );
}
