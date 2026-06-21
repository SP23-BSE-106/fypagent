"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
} from "recharts";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { BarChart3, Activity, Coins, Clock } from "lucide-react";

// Mock statistics datasets
const executionHistory = [
  { day: "Mon", runs: 4200, latency: 2.1 },
  { day: "Tue", runs: 5800, latency: 1.9 },
  { day: "Wed", runs: 8200, latency: 1.8 },
  { day: "Thu", runs: 7900, latency: 2.4 },
  { day: "Fri", runs: 11000, latency: 2.0 },
  { day: "Sat", runs: 6100, latency: 1.6 },
  { day: "Sun", runs: 4900, latency: 1.5 },
];

const modelTokenUsage = [
  { name: "GPT-4o", input: 240, output: 140 },
  { name: "Claude 3.5 Sonnet", input: 180, output: 110 },
  { name: "Llama 3.1 70B", input: 90, output: 60 },
  { name: "DeepSeek V3", input: 310, output: 190 },
];

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = React.useState("runs");

  return (
    <DashboardLayout>
      <div className="space-y-8 select-none text-left">
        {/* Header */}
        <div className="space-y-1">
          <h2 className="font-h1 font-bold text-foreground">System Analytics</h2>
          <p className="text-xs text-muted">
            Monitor API executions, model token outputs, average runtime latencies, and aggregated credits/cost estimates.
          </p>
        </div>

        {/* Small stats banner widgets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wide">Aggregated Executions</span>
              <div className="text-xl font-extrabold text-foreground">48.1K</div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-accent-muted flex items-center justify-center text-accent">
              <Activity className="h-4.5 w-4.5" />
            </div>
          </Card>
          <Card className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wide">Estimated cost</span>
              <div className="text-xl font-extrabold text-foreground">$142.06</div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-accent-muted flex items-center justify-center text-accent">
              <Coins className="h-4.5 w-4.5" />
            </div>
          </Card>
          <Card className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wide">Avg Node latency</span>
              <div className="text-xl font-extrabold text-foreground">1.94s</div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-accent-muted flex items-center justify-center text-accent">
              <Clock className="h-4.5 w-4.5" />
            </div>
          </Card>
          <Card className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wide">Avg Success Rate</span>
              <div className="text-xl font-extrabold text-foreground">99.82%</div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-accent-muted flex items-center justify-center text-accent">
              <BarChart3 className="h-4.5 w-4.5" />
            </div>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Area Chart: Executions over days */}
          <Card className="lg:col-span-2 p-6 flex flex-col justify-between min-h-[350px]">
            <div className="flex items-center justify-between mb-6 flex-shrink-0">
              <div className="space-y-1">
                <CardTitle className="text-xs font-bold text-foreground">Execution Load History</CardTitle>
                <CardDescription className="text-[10px]">Weekly pipeline counts triggered on widget webhooks.</CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge
                  variant={activeTab === "runs" ? "accent" : "secondary"}
                  className="cursor-pointer"
                  onClick={() => setActiveTab("runs")}
                >
                  Runs
                </Badge>
                <Badge
                  variant={activeTab === "latency" ? "accent" : "secondary"}
                  className="cursor-pointer"
                  onClick={() => setActiveTab("latency")}
                >
                  Latency
                </Badge>
              </div>
            </div>

            <div className="flex-1 w-full min-h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={executionHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRuns" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#5BE7C4" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#5BE7C4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" opacity={0.5} />
                  <XAxis dataKey="day" stroke="#94A3B8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} />
                  <ChartTooltip
                    contentStyle={{
                      backgroundColor: "#131A23",
                      borderColor: "#1E293B",
                      borderRadius: "8px",
                      fontSize: "11px",
                      color: "#F8FAFC",
                    }}
                  />
                  {activeTab === "runs" ? (
                    <Area type="monotone" dataKey="runs" stroke="#5BE7C4" strokeWidth={2} fillOpacity={1} fill="url(#colorRuns)" />
                  ) : (
                    <Area type="monotone" dataKey="latency" stroke="#38BDF8" strokeWidth={2} fillOpacity={0} />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Model token usage distribution */}
          <Card className="p-6 flex flex-col justify-between min-h-[350px]">
            <div className="mb-6 flex-shrink-0">
              <CardTitle className="text-xs font-bold text-foreground">Token distribution by model</CardTitle>
              <CardDescription className="text-[10px]">Averages in thousands (K) of input/output prompt blocks.</CardDescription>
            </div>

            <div className="flex-1 w-full min-h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={modelTokenUsage} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" opacity={0.5} />
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={9} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} />
                  <ChartTooltip
                    contentStyle={{
                      backgroundColor: "#131A23",
                      borderColor: "#1E293B",
                      borderRadius: "8px",
                      fontSize: "11px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "10px", marginTop: "10px" }} />
                  <Bar dataKey="input" fill="#1E293B" radius={[4, 4, 0, 0]} name="Input Tokens" stroke="#334155" />
                  <Bar dataKey="output" fill="#5BE7C4" radius={[4, 4, 0, 0]} name="Output Tokens" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
