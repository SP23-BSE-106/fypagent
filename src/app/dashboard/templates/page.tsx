"use client";

import * as React from "react";
import Link from "next/link";
import {
  Boxes,
  Zap,
  Cpu,
  Search,
  Star,
  Download,
  Sparkles,
  MessageSquare,
  Shield,
  Globe,
  BookOpen,
  Workflow,
  Target,
  Megaphone,
  Network,
  Calendar,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export default function TemplateMarketplacePage() {

  const [searchQuery, setSearchQuery] = React.useState("");
  const [category, setCategory] = React.useState<string>("All");
  const [verifiedOnly, setVerifiedOnly] = React.useState<boolean>(false);
  const [minRating, setMinRating] = React.useState<number>(4.0);

  const templates = [
    {
      name: "Customer Support Escalator",
      category: "Customer Service",
      model: "GPT-4o",
      nodes: 7,
      rating: 4.9,
      downloads: "1.2k",
      desc: "Reads customer inquiries, performs semantic search on support docs, drafts answers, and escalates unresolved cases to human Slack rooms.",
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
      desc: "On webhook signup, pulls enrichment from public profiles, scores intent with an LLM, and generates personalized onboarding sequences.",
      icon: Megaphone,
      popular: false,
    },
    {
      name: "GitHub Reviewer & SecOps",
      category: "Developer Tools",
      model: "Llama 3.1 70B",
      nodes: 8,
      rating: 4.7,
      downloads: "630",
      desc: "Analyzes diffs, detects secrets, validates style rules, and posts line-specific security & quality feedback on PRs.",
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
      desc: "Ingests RSS/feeds, extracts sentiment signals, and compiles weekly executive summaries into Slack dashboards.",
      icon: Boxes,
      popular: false,
    },

    {
      name: "RAG Contract Q&A",
      category: "Legal & Compliance",
      model: "GPT-4o",
      nodes: 9,
      rating: 4.8,
      downloads: "510",
      desc: "Uploads contracts, builds embeddings, answers clause questions with citations, and flags risky language for review.",
      icon: BookOpen,
      popular: true,
    },
    {
      name: "Security Policy Copilot",
      category: "Legal & Compliance",
      model: "Llama 3.1 70B",
      nodes: 6,
      rating: 4.6,
      downloads: "420",
      desc: "Transforms internal controls into structured policies and generates audit-ready evidence checklists.",
      icon: Shield,
      popular: false,
    },
    {
      name: "Global Language Translator Agent",
      category: "Productivity",
      model: "GPT-4o",
      nodes: 4,
      rating: 4.7,
      downloads: "980",
      desc: "Auto-detects language, translates with tone preservation, and returns glossary-consistent outputs.",
      icon: Globe,
      popular: true,
    },
    {
      name: "Meeting Notes to Tasks",
      category: "Productivity",
      model: "Claude 3.5 Sonnet",
      nodes: 5,
      rating: 4.8,
      downloads: "760",
      desc: "Summarizes meetings, extracts decisions/actions, and creates structured tasks with owners and due dates.",
      icon: Calendar,
      popular: false,
    },

    {
      name: "Support KB Summarizer",
      category: "Customer Service",
      model: "DeepSeek V3",
      nodes: 4,
      rating: 4.5,
      downloads: "390",
      desc: "Reads large knowledge articles, creates concise summaries, and drafts simplified help-center entries.",
      icon: MessageSquare,
      popular: false,
    },
    {
      name: "Incident Postmortem Writer",
      category: "DevOps",
      model: "GPT-4o",
      nodes: 7,
      rating: 4.9,
      downloads: "680",
      desc: "Ingests logs/incident timelines, identifies contributing factors, and produces blame-free postmortems with action items.",
      icon: Workflow,
      popular: true,
    },
    {
      name: "Deployment Risk Assessor",
      category: "DevOps",
      model: "Llama 3.1 70B",
      nodes: 6,
      rating: 4.6,
      downloads: "510",
      desc: "Examines release notes and diffs, predicts likely failure modes, and suggests safer rollout strategies.",
      icon: Target,
      popular: false,
    },
    {
      name: "Web Page Content Auditor",
      category: "Growth",
      model: "GPT-4o",
      nodes: 6,
      rating: 4.7,
      downloads: "430",
      desc: "Analyzes pages for UX copy issues, SEO gaps, and conversion blockers; outputs prioritized improvement recommendations.",
      icon: Network,
      popular: false,
    },

    {
      name: "Customer Churn Predictor",
      category: "Business Intelligence",
      model: "DeepSeek V3",
      nodes: 7,
      rating: 4.7,
      downloads: "740",
      desc: "Combines usage metrics and support history to predict churn risk and suggests retention interventions.",
      icon: Boxes,
      popular: true,
    },
    {
      name: "Product Feedback Triage",
      category: "Growth",
      model: "Claude 3.5 Sonnet",
      nodes: 5,
      rating: 4.8,
      downloads: "1.0k",
      desc: "Clustering + LLM labeling for incoming feedback, deduplicates issues, and drafts acceptance criteria for engineering.",
      icon: Sparkles,
      popular: true,
    },

    {
      name: "Webhook Router & Enricher",
      category: "Automation",
      model: "GPT-4o",
      nodes: 6,
      rating: 4.6,
      downloads: "520",
      desc: "Routes webhook events to specialized chains, enriches payloads, and produces normalized records for downstream tools.",
      icon: Zap,
      popular: false,
    },
    {
      name: "Data Quality Validator",
      category: "Automation",
      model: "Llama 3.1 70B",
      nodes: 5,
      rating: 4.5,
      downloads: "310",
      desc: "Validates schemas, detects anomalies, and generates human-readable remediation steps for broken data.",
      icon: Network,
      popular: false,
    },

    {
      name: "Travel Itinerary Builder",
      category: "Lifestyle",
      model: "GPT-4o",
      nodes: 6,
      rating: 4.7,
      downloads: "880",
      desc: "Creates day-by-day itineraries with preferences, budget tiers, and contingency suggestions for weather delays.",
      icon: Calendar,
      popular: true,
    },
    {
      name: "Resume ATS Optimizer",
      category: "Lifestyle",
      model: "Claude 3.5 Sonnet",
      nodes: 5,
      rating: 4.8,
      downloads: "1.1k",
      desc: "Takes a resume + job description, matches keywords, rewrites summaries, and outputs ATS-friendly formatting.",
      icon: BookOpen,
      popular: false,
    },

    {
      name: "Course Outline Generator",
      category: "Education",
      model: "DeepSeek V3",
      nodes: 6,
      rating: 4.6,
      downloads: "360",
      desc: "Generates structured lesson plans, quizzes, and project prompts aligned to learning objectives.",
      icon: BookOpen,
      popular: false,
    },
    {
      name: "Study Session Planner",
      category: "Education",
      model: "GPT-4o",
      nodes: 4,
      rating: 4.7,
      downloads: "640",
      desc: "Builds spaced-repetition schedules, prioritizes weak areas, and creates bite-sized practice tasks.",
      icon: Sparkles,
      popular: true,
    },
  ];

  const categories = React.useMemo(() => {
    const set = new Set<string>(templates.map((t) => t.category));
    return ["All", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [templates]);

  const filteredTemplates = templates.filter((temp) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      q.length === 0 ||
      temp.name.toLowerCase().includes(q) ||
      temp.category.toLowerCase().includes(q);

    const matchesCategory = category === "All" || temp.category === category;
    const matchesVerified = !verifiedOnly || temp.popular;
    const matchesRating = temp.rating >= minRating;

    return matchesSearch && matchesCategory && matchesVerified && matchesRating;
  });


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

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="min-w-[180px]">
              <label className="block text-[10px] text-muted font-semibold mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-surface border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent/40 transition-all"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="verifiedOnly"
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
                className="h-3.5 w-3.5 accent-accent"
              />
              <label htmlFor="verifiedOnly" className="text-[10px] text-muted font-semibold">
                Verified only
              </label>
            </div>

            <div className="min-w-[160px]">
              <label className="block text-[10px] text-muted font-semibold mb-1">
                Min rating: {minRating.toFixed(1)}+
              </label>
              <input
                type="range"
                min={0}
                max={5}
                step={0.1}
                value={minRating}
                onChange={(e) => setMinRating(parseFloat(e.target.value))}
                className="w-full accent-accent"
              />
            </div>
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
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xs font-bold text-foreground">{temp.name}</CardTitle>
                    {temp.popular && (
                      <Badge variant="secondary" className="text-[9px] px-2 py-0 rounded-full">
                        Verified
                      </Badge>
                    )}
                  </div>
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
