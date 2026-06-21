"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import {
  Sparkles, GitBranch, Terminal, Shield, Zap, Check,
  ArrowRight, ChevronRight, Circle,
} from "lucide-react";
import dynamic from "next/dynamic";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

// Lazy‑load the heavy Three.js canvas so it never SSR-crashes
const ThreeBackground = dynamic(
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
  const ref = React.useRef(null);
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
    {/* internal top shine */}
    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
    {children}
  </div>
);

// ─── NODE CARD (hero mockup) ──────────────────────────────────────────────────
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
    transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, ease: "easeInOut" }}
    style={style}
    className={cn(
      "absolute select-none rounded-xl border bg-[#131A23]/90 backdrop-blur-md p-3 w-44 shadow-2xl",
      active ? "border-accent/50 shadow-accent/10" : "border-white/8"
    )}
  >
    <div className="flex items-center gap-2 mb-1.5">
      <div className={cn("h-5 w-5 rounded flex items-center justify-center text-[9px] font-black", active ? "bg-accent/20 text-accent" : "bg-white/5 text-white/40")}>
        {type.slice(0, 2).toUpperCase()}
      </div>
      <span className="text-[11px] font-bold text-white/90 leading-none">{label}</span>
      {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />}
    </div>
    <p className="text-[9px] text-white/35 leading-relaxed">{type}</p>
  </motion.div>
);

// ─── DATA FLOWS (SVG connector lines between nodes) ──────────────────────────
const FlowLine = ({ x1, y1, x2, y2, active }: { x1: number; y1: number; x2: number; y2: number; active?: boolean }) => (
  <motion.line
    x1={x1} y1={y1} x2={x2} y2={y2}
    stroke={active ? "#5BE7C4" : "#1E293B"}
    strokeWidth={active ? 1.5 : 1}
    strokeDasharray="4 4"
    initial={{ pathLength: 0, opacity: 0 }}
    animate={{ pathLength: 1, opacity: 1 }}
    transition={{ duration: 1.5, delay: 0.5, ease: "easeInOut" }}
  />
);

// ─── STAT TICKER ─────────────────────────────────────────────────────────────
const stats = [
  { label: "Agent Executions", value: "48.3K" },
  { label: "Avg Response", value: "1.94s" },
  { label: "Token Accuracy", value: "99.8%" },
  { label: "LLM Providers", value: "8+" },
];

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const heroRef = React.useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

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
      features: ["3 active agent flows", "100 MB RAG storage", "Shared API sandbox", "Community support"],
    },
    {
      name: "Pro",
      price: "$49",
      highlight: true,
      features: ["Unlimited workflows", "5 GB document DB", "Custom domain widget", "Dedicated API keys", "Priority support"],
    },
    {
      name: "Enterprise",
      price: "Custom",
      highlight: false,
      features: ["Self‑hosted option", "Unlimited storage", "Custom SSO & IAM", "99.9% SLA", "Dedicated architect"],
    },
  ];

  return (
    <PublicLayout>
      {/* ══════════════════════════════════════════════════════════
          HERO — full-viewport with 3D canvas + glass overlay
      ═══════════════════════════════════════════════════════════ */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex overflow-hidden bg-[#060b10]"
      >
        {/* ── LEFT PANEL — solid dark backing so text is always clean ── */}
        <div className="relative z-10 flex flex-col justify-center w-full lg:w-[52%] px-8 sm:px-14 lg:pl-20 lg:pr-12 py-28 lg:py-0 bg-[#060b10]">
          {/* subtle left-column grid texture */}
          <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(to_right,rgba(255,255,255,0.5)_1px,transparent_1px)] [background-size:40px_40px]" />
          {/* soft teal top-left glow */}
          <div className="pointer-events-none absolute -top-20 -left-20 w-96 h-96 rounded-full bg-accent/5 blur-[120px]" />

          <motion.div
            style={{ y: heroY, opacity: heroOpacity }}
            className="relative"
          >
            {/* Badge */}
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

            {/* Display heading */}
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
                <button className="group inline-flex h-12 items-center gap-2.5 rounded-full bg-accent px-7 text-sm font-bold text-[#060b10] shadow-[0_0_30px_rgba(91,231,196,0.35)] transition-all duration-300 hover:shadow-[0_0_50px_rgba(91,231,196,0.6)] hover:scale-[1.03] active:scale-[0.97]">
                  Start Building Free
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>
              </Link>
              <Link href="/workflow-builder">
                <button className="inline-flex h-12 items-center gap-2 rounded-full border border-white/12 bg-white/4 px-7 text-sm font-semibold text-white/75 transition-all duration-300 hover:border-white/25 hover:bg-white/8 hover:text-white">
                  <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                  Live Demo
                </button>
              </Link>
            </motion.div>

            {/* Stat tickers */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.8 }}
              className="mt-14 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-6"
            >
              {stats.map((s, i) => (
                <div key={i}>
                  <div className="text-2xl font-black text-white tabular-nums">{s.value}</div>
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-white/30 mt-1">{s.label}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>

        {/* Smooth edge blend from left panel into the 3D canvas */}
        <div className="hidden lg:block pointer-events-none absolute top-0 left-[52%] -translate-x-full w-40 h-full z-20 bg-gradient-to-r from-[#060b10] to-transparent" />

        {/* ── RIGHT PANEL — Three.js canvas + floating nodes ── */}
        <div className="hidden lg:block absolute right-0 top-0 w-[52%] h-full z-0">
          {/* 3D canvas fills this column only */}
          <ThreeBackground className="absolute inset-0" />

          {/* scan-line texture on top of canvas */}
          <div className="pointer-events-none absolute inset-0 opacity-[0.012] [background:repeating-linear-gradient(0deg,transparent,transparent_2px,#fff_2px,#fff_3px)]" />

          {/* Floating node cards */}
          <div className="pointer-events-none relative w-full h-full">
            <svg className="absolute inset-0 w-full h-full" style={{ overflow: "visible" }}>
              <FlowLine x1={240} y1={230} x2={150} y2={310} active />
              <FlowLine x1={240} y1={230} x2={330} y2={320} />
              <FlowLine x1={150} y1={360} x2={240} y2={440} active />
              <FlowLine x1={330} y1={370} x2={240} y2={440} />
            </svg>
            <NodeCard label="Webhook Ingestion" type="Input trigger"     style={{ top: "20%", left: "35%" }} />
            <NodeCard label="Model Router"      type="LLM Node · GPT‑4o" active style={{ top: "40%", left: "14%" }} />
            <NodeCard label="RAG Retrieval"     type="Vector search"     style={{ top: "40%", left: "54%" }} />
            <NodeCard label="Response Output"   type="Compiled result"   active style={{ top: "61%", left: "35%" }} />
          </div>
        </div>

        {/* Bottom fade blend */}
        <div className="pointer-events-none absolute bottom-0 inset-x-0 h-28 z-30 bg-gradient-to-t from-[#060b10] to-transparent" />
      </section>

      {/* ══════════════════════════════════════════════════════════
          LOGO SCROLL STRIP
      ═══════════════════════════════════════════════════════════ */}
      <div className="bg-[#060b10] border-y border-white/5 py-5 overflow-hidden">
        <div className="flex gap-12 animate-[marquee_28s_linear_infinite] whitespace-nowrap">
          {["OpenAI", "Anthropic", "Mistral", "DeepSeek", "Ollama", "LangChain", "Pinecone", "Weaviate",
            "OpenAI", "Anthropic", "Mistral", "DeepSeek", "Ollama", "LangChain", "Pinecone", "Weaviate"].map((name, i) => (
            <span key={i} className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-white/20">
              <Circle className="h-1 w-1 fill-accent text-accent" />
              {name}
            </span>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          BENTO FEATURES GRID
      ═══════════════════════════════════════════════════════════ */}
      <section className="relative bg-[#060b10] py-28 px-4 sm:px-6">
        {/* subtle grid bg */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.025] [background-image:linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(to_right,rgba(255,255,255,0.5)_1px,transparent_1px)] [background-size:60px_60px]" />

        <div className="mx-auto max-w-6xl">
          <FadeUp className="text-center mb-16">
            <p className="text-[11px] font-bold uppercase tracking-widest text-accent mb-4">Capabilities</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white/95 tracking-tighter leading-tight">
              Everything you need to<br className="hidden md:block" /> orchestrate production AI teams
            </h2>
          </FadeUp>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[260px]">
            {/* Feature 0 — wide */}
            <FadeUp delay={0.05} className="md:col-span-2">
              <BentoCard glow className="h-full p-8 flex flex-col justify-between">
                <div>
                  <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent mb-5">
                    <GitBranch className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Visual Node Canvas</h3>
                  <p className="text-sm text-white/40 leading-relaxed max-w-sm">
                    Drag‑and‑drop multi‑agent logic with React Flow. Connect LLMs, APIs, memory, and RAG stores in seconds.
                  </p>
                </div>
                {/* mini canvas illustration */}
                <div className="relative h-20 rounded-lg bg-black/30 border border-white/5 overflow-hidden mt-4">
                  <div className="absolute inset-0 flex items-center px-4 gap-3">
                    {["IN", "LLM", "RAG", "OUT"].map((t, i) => (
                      <React.Fragment key={i}>
                        <div className="rounded bg-[#131A23] border border-accent/20 px-2 py-1 text-[9px] font-bold text-accent whitespace-nowrap">{t}</div>
                        {i < 3 && <div className="flex-1 h-px border-t border-dashed border-accent/20" />}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </BentoCard>
            </FadeUp>

            {/* Feature 1 */}
            <FadeUp delay={0.1}>
              <BentoCard className="h-full p-8 flex flex-col justify-between">
                <div>
                  <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent mb-5">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Vibe Coding</h3>
                  <p className="text-sm text-white/40 leading-relaxed">
                    Describe your agent team in plain English. Our synthesis engine compiles structured workflows automatically.
                  </p>
                </div>
                <div className="mt-4 rounded-lg bg-black/30 border border-white/5 p-3 font-mono text-[10px] text-accent/70 leading-relaxed">
                  <span className="text-white/30">›</span> Create a support agent that reads PDFs and routes tickets...
                  <br />
                  <span className="text-accent animate-pulse">_</span>
                </div>
              </BentoCard>
            </FadeUp>

            {/* Feature 2 */}
            <FadeUp delay={0.15}>
              <BentoCard className="h-full p-8 flex flex-col justify-between">
                <div>
                  <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent mb-5">
                    <Terminal className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Live Sandbox</h3>
                  <p className="text-sm text-white/40 leading-relaxed">
                    Run, trace, and debug in real‑time with synchronized execution logs.
                  </p>
                </div>
              </BentoCard>
            </FadeUp>

            {/* Feature 3 */}
            <FadeUp delay={0.2}>
              <BentoCard className="h-full p-8 flex flex-col justify-between">
                <div>
                  <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent mb-5">
                    <Zap className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">One‑Click Deploy</h3>
                  <p className="text-sm text-white/40 leading-relaxed">
                    Ship as a REST endpoint, floating chat widget, or public shareable link.
                  </p>
                </div>
              </BentoCard>
            </FadeUp>

            {/* Feature 4 */}
            <FadeUp delay={0.25}>
              <BentoCard className="h-full p-8 flex flex-col justify-between">
                <div>
                  <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent mb-5">
                    <Shield className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Secure Guardrails</h3>
                  <p className="text-sm text-white/40 leading-relaxed">
                    Token budgets, rate limits, and content policies baked in to every pipeline.
                  </p>
                </div>
              </BentoCard>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          HOW IT WORKS — three steps
      ═══════════════════════════════════════════════════════════ */}
      <section className="bg-[#060b10] py-28 px-4 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <FadeUp className="text-center mb-20">
            <p className="text-[11px] font-bold uppercase tracking-widest text-accent mb-4">How it works</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white/95 tracking-tighter">
              From prompt to production<br className="hidden md:block" /> in three steps
            </h2>
          </FadeUp>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { n: "01", title: "Design on Canvas", body: "Open the visual builder and wire up agents, LLMs, RAG nodes, and API actions in a drag-and-drop canvas." },
              { n: "02", title: "Test in Sandbox", body: "Chat with your workflow live. Each message replays the full execution trace so you see exactly what each node does." },
              { n: "03", title: "Deploy Anywhere", body: "Copy a widget script, hit an REST endpoint, or share a public link. Your agents run 24/7 on our managed infra." },
            ].map((step, i) => (
              <FadeUp key={i} delay={i * 0.12}>
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

      {/* ══════════════════════════════════════════════════════════
          PRICING
      ═══════════════════════════════════════════════════════════ */}
      <section className="relative bg-[#060b10] py-28 px-4 sm:px-6 overflow-hidden">
        <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-[600px] w-[600px] rounded-full bg-accent/3 blur-[140px]" />

        <div className="mx-auto max-w-5xl relative z-10">
          <FadeUp className="text-center mb-16">
            <p className="text-[11px] font-bold uppercase tracking-widest text-accent mb-4">Pricing</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white/95 tracking-tighter">
              Simple, transparent plans
            </h2>
          </FadeUp>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pricing.map((tier, i) => (
              <FadeUp key={i} delay={i * 0.1}>
                <div
                  className={cn(
                    "relative flex flex-col rounded-2xl border p-7 h-full transition-all duration-300",
                    tier.highlight
                      ? "border-accent/40 bg-gradient-to-b from-accent/5 to-transparent shadow-[0_0_40px_-10px_rgba(91,231,196,0.2)] scale-[1.02]"
                      : "border-white/8 bg-[#0d1520]/60"
                  )}
                >
                  {tier.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-1 text-[9px] font-black uppercase tracking-widest text-[#060b10]">
                      Most Popular
                    </div>
                  )}
                  <div className="mb-6">
                    <h3 className="text-sm font-bold text-white/70 uppercase tracking-widest mb-4">{tier.name}</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black text-white">{tier.price}</span>
                      {tier.price !== "Custom" && <span className="text-white/30 text-sm">/mo</span>}
                    </div>
                  </div>
                  <ul className="space-y-3 flex-1">
                    {tier.features.map((f, j) => (
                      <li key={j} className="flex items-center gap-2.5 text-sm text-white/55">
                        <Check className="h-3.5 w-3.5 text-accent flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/signup" className="mt-8 block">
                    <button
                      className={cn(
                        "w-full rounded-xl py-3 text-sm font-bold transition-all duration-200",
                        tier.highlight
                          ? "bg-accent text-[#060b10] shadow-[0_0_20px_rgba(91,231,196,0.3)] hover:shadow-[0_0_35px_rgba(91,231,196,0.45)]"
                          : "border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      {tier.price === "Custom" ? "Contact Sales" : "Get Started"}
                    </button>
                  </Link>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          BOTTOM CTA BANNER
      ═══════════════════════════════════════════════════════════ */}
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
              <button className="inline-flex h-13 items-center gap-2.5 rounded-full bg-accent px-8 text-sm font-bold text-[#060b10] shadow-[0_0_30px_rgba(91,231,196,0.35)] transition-all duration-300 hover:shadow-[0_0_50px_rgba(91,231,196,0.55)] hover:scale-[1.03]">
                Start for Free <ArrowRight className="h-4 w-4" />
              </button>
            </Link>
            <Link href="/docs">
              <button className="inline-flex h-13 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-8 text-sm font-semibold text-white/70 backdrop-blur-sm transition-all duration-200 hover:border-white/20 hover:text-white">
                Read the Docs
              </button>
            </Link>
          </div>
        </FadeUp>
      </section>

      {/* marquee keyframe */}
      <style>{`
        @keyframes marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </PublicLayout>
  );
}
