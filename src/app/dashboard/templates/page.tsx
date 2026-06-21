"use client";

import * as React from "react";
import Link from "next/link";
import { Boxes, Zap, Cpu, Search, Star, Download, Sparkles, MessageSquare } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export default function TemplateMarketplacePage() {
  const [searchQuery, setSearchQuery] = React.useState("");

  const templates = [
    {
      name: "Customer Support Escalator",
      category: "Customer Service",
      model: "GPT-4o",
      nodes: 7,
      rating: 4.9,
      downloads: "1.2k",
      desc: "Reads customer inquiries, executes semantic search on support guidelines, structures answers, and escalates to human Slack rooms if unresolved.",
      icon: MessageSquare,
      popular: true,
    },
    {
      name: "SaaS Lead Enricher",
      category: "Marketing Automation",
      model: "Claude 3.5 Sonnet",
      nodes: 6,
      rating: 4.8,
      downloads: "940",
      desc: "Triggers on webhook registration, queries Clearbit API for user bio, evaluates lead scores using LLMs, and triggers customized onboarding campaigns.",
      icon: Zap,
      popular: false,
    },
    {
      name: "GitHub Reviewer & SecOps",
      category: "Developer Tools",
      model: "Llama 3.1 70B",
      nodes: 8,
      rating: 4.7,
      downloads: "630",
      desc: "Analyzes Git diff files, scans for API token exposures, evaluates code standards, and posts line-specific reviews on pull requests.",
      icon: Cpu,
      popular: true,
    },
    {
      name: "Financial Sentiment Analyst",
      category: "Business Intelligence",
      model: "DeepSeek V3",
      nodes: 5,
      rating: 4.9,
      downloads: "810",
      desc: "Queries real-time RSS feeds, parses market articles sentiment, and compiles weekly summaries to Slack dashboards.",
      icon: Boxes,
      popular: false,
    },
  ];

  const filteredTemplates = templates.filter(
    (temp) =>
      temp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      temp.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-8 select-none text-left">
        {/* Header Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="font-h1 font-bold text-foreground">Template Marketplace</h2>
            <p className="text-xs text-muted">
              Deploy pre-built agent structures instantly. Connect tools and models into optimized pipeline logic.
            </p>
          </div>

          <div className="max-w-xs w-full relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
            <input
              type="text"
              placeholder="Search category, name..."
              className="w-full bg-surface border border-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted/60 focus:outline-none focus:border-accent/40 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Marketplace cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredTemplates.map((temp) => {
            const Icon = temp.icon;
            return (
              <Card key={temp.name} hoverEffect className="flex flex-col justify-between relative overflow-hidden border border-border/80 hover:border-accent/30">
                {temp.popular && (
                  <div className="absolute right-0 top-0 bg-accent text-[#0B0F14] font-bold text-[9px] uppercase tracking-wider px-3.5 py-1 rounded-bl-lg flex items-center gap-1">
                    <Sparkles className="h-2.5 w-2.5" />
                    Verified
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-accent-muted flex items-center justify-center text-accent">
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <div className="space-y-0.5">
                      <CardTitle className="text-xs font-bold text-foreground">{temp.name}</CardTitle>
                      <span className="text-[9px] text-muted font-semibold uppercase tracking-wider">{temp.category}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="py-0 flex-1 space-y-4">
                  <p className="text-xs text-muted leading-relaxed">
                    {temp.desc}
                  </p>
                  
                  <div className="flex items-center gap-4 text-[10px] text-muted">
                    <div className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 text-amber-400 fill-current" />
                      <span className="font-bold text-foreground">{temp.rating}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Download className="h-3.5 w-3.5 text-muted" />
                      <span className="font-bold text-foreground">{temp.downloads} installs</span>
                    </div>
                    <div>
                      <span>{temp.nodes} Nodes</span>
                    </div>
                  </div>
                </CardContent>
                <div className="p-6 pt-4 border-t border-border/40 mt-6 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-muted font-medium">Model: {temp.model}</span>
                  <Link href="/workflow-builder">
                    <Button size="sm">
                      <Download className="h-3.5 w-3.5 mr-1.5" />
                      Deploy Template
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}

          {filteredTemplates.length === 0 && (
            <div className="col-span-2 text-center py-12 text-xs text-muted">
              No template items matched your search query. Please try searching something else.
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
