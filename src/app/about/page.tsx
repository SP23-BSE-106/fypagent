"use client";

import * as React from "react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Cpu, GitBranch, Terminal, Shield, Check } from "lucide-react";

export default function AboutPage() {
  const stack = [
    { name: "Next.js 16", desc: "App Router and Server Component architecture." },
    { name: "TypeScript", desc: "Type-safe definitions across canvas modules." },
    { name: "Tailwind CSS v4", desc: "Modern CSS configuration, layout controls." },
    { name: "React Flow", desc: "Interactive reactive canvas rendering node connections." },
    { name: "Zustand", desc: "Global layout state synchronization and logs stack." },
    { name: "Framer Motion", desc: "Polished panels slide and hover animations." }
  ];

  return (
    <PublicLayout>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16 text-left select-none space-y-12">
        {/* Header */}
        <div className="space-y-3 pb-8 border-b border-border/40 text-center max-w-3xl mx-auto">
          <h1 className="font-display mb-4 text-foreground">Project Vision</h1>
          <p className="font-body text-muted text-sm leading-relaxed">
            AgentFlow is a Final Year Project (FYP) dedicated to resolving the complexity of constructing and scaling multi-agent LLM systems. Our goal is to provide a premium visual orchestration canvas that bridges prompt templates, documents vector RAG pipelines, and web API hooks.
          </p>
        </div>

        {/* Pillars grids */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="p-6">
            <h3 className="font-h3 font-bold text-foreground mb-4">Core Principles</h3>
            <ul className="space-y-4 text-xs text-muted">
              <li className="flex gap-3">
                <Check className="h-5 w-5 text-accent flex-shrink-0" />
                <p className="leading-relaxed">
                  <strong className="text-foreground font-semibold">Visual-First Design</strong>: Build logical model pipelines visually instead of hardcoding linear conditional strings in backend script sheets.
                </p>
              </li>
              <li className="flex gap-3">
                <Check className="h-5 w-5 text-accent flex-shrink-0" />
                <p className="leading-relaxed">
                  <strong className="text-foreground font-semibold">Sandbox Execution Tracing</strong>: Simulate user queries live and inspect intermediate token transfers for complete transparency.
                </p>
              </li>
            </ul>
          </Card>

          {/* Technology stack card */}
          <Card className="p-6">
            <h3 className="font-h3 font-bold text-foreground mb-4">Frontend Technology Stack</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {stack.map((item, i) => (
                <div key={i} className="space-y-1">
                  <Badge variant="outline" className="text-[10px] font-bold">
                    {item.name}
                  </Badge>
                  <p className="text-[10px] text-muted leading-relaxed mt-1">{item.desc}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </PublicLayout>
  );
}
