"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Play, Save, CloudLightning, Terminal, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface BuilderLayoutProps {
  children: React.ReactNode; // Typically the react-flow canvas
  title: string;
  subtitle?: string;
  leftPanel?: React.ReactNode;
  rightPanel?: React.ReactNode;
  bottomLogs?: React.ReactNode;
  onRun?: () => void;
  onSave?: () => void;
  onDeploy?: () => void;
  isRunning?: boolean;
}

export const BuilderLayout: React.FC<BuilderLayoutProps> = ({
  children,
  title,
  subtitle,
  leftPanel,
  rightPanel,
  bottomLogs,
  onRun,
  onSave,
  onDeploy,
  isRunning = false,
}) => {
  const [showLogs, setShowLogs] = React.useState(true);
  const [leftOpen, setLeftOpen] = React.useState(true);
  const [rightOpen, setRightOpen] = React.useState(true);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background text-foreground select-none">
      {/* Header bar */}
      <header className="h-14 border-b border-border/80 bg-surface/50 backdrop-blur-md px-4 flex items-center justify-between flex-shrink-0 z-10">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <button className="h-8 w-8 flex items-center justify-center rounded-lg border border-border bg-surface hover:bg-surface-light hover:text-accent transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </button>
          </Link>
          <div className="flex flex-col text-left">
            <h1 className="text-xs font-bold text-foreground leading-none">{title}</h1>
            {subtitle && <p className="text-[10px] text-muted mt-1">{subtitle}</p>}
          </div>
        </div>

        {/* Builder Toolbar Actions */}
        <div className="flex items-center gap-2">
          {onRun && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRun}
              isLoading={isRunning}
              className="border-accent/20 text-accent hover:bg-accent/10"
            >
              <Play className="h-3.5 w-3.5 mr-1.5 fill-current" />
              Run Agent
            </Button>
          )}
          {onSave && (
            <Button variant="secondary" size="sm" onClick={onSave}>
              <Save className="h-3.5 w-3.5 mr-1.5" />
              Save Draft
            </Button>
          )}
          {onDeploy && (
            <Button size="sm" onClick={onDeploy}>
              <CloudLightning className="h-3.5 w-3.5 mr-1.5" />
              Deploy
            </Button>
          )}
        </div>
      </header>

      {/* Main Body Panels */}
      <div className="flex-1 flex min-h-0 relative">
        {/* Left Side Panel */}
        {leftPanel && leftOpen && (
          <aside className="w-72 border-r border-border bg-surface flex flex-col min-w-[280px] z-10 animate-in slide-in-from-left duration-200">
            {leftPanel}
          </aside>
        )}
        
        {/* Toggle Left Button */}
        {leftPanel && (
          <button
            onClick={() => setLeftOpen(!leftOpen)}
            className={cn(
              "absolute left-0 top-1/2 -translate-y-1/2 z-20 flex h-8 w-3 items-center justify-center rounded-r border border-l-0 border-border bg-surface text-muted hover:text-foreground",
              leftOpen ? "left-72" : "left-0"
            )}
          >
            <span className="text-[8px]">{leftOpen ? "◀" : "▶"}</span>
          </button>
        )}

        {/* Center Workspace Area */}
        <div className="flex-1 flex flex-col min-w-0 relative">
          <div className="flex-1 relative bg-[#0b0f14] bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px]">
            {children}
          </div>

          {/* Bottom Log Pane */}
          {bottomLogs && (
            <div
              className={cn(
                "border-t border-border bg-surface flex flex-col transition-all duration-200 z-10",
                showLogs ? "h-64" : "h-9"
              )}
            >
              <div
                onClick={() => setShowLogs(!showLogs)}
                className="h-9 px-4 flex items-center justify-between border-b border-border/40 hover:bg-surface-light/30 cursor-pointer text-xs font-semibold text-muted hover:text-foreground select-none"
              >
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-accent" />
                  <span>Execution & Trace Logs</span>
                </div>
                <div>{showLogs ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}</div>
              </div>
              {showLogs && <div className="flex-1 overflow-auto bg-black/40 font-mono text-xs">{bottomLogs}</div>}
            </div>
          )}
        </div>

        {/* Toggle Right Button */}
        {rightPanel && (
          <button
            onClick={() => setRightOpen(!rightOpen)}
            className={cn(
              "absolute right-0 top-1/2 -translate-y-1/2 z-20 flex h-8 w-3 items-center justify-center rounded-l border border-r-0 border-border bg-surface text-muted hover:text-foreground",
              rightOpen ? "right-[320px]" : "right-0"
            )}
          >
            <span className="text-[8px]">{rightOpen ? "▶" : "◀"}</span>
          </button>
        )}

        {/* Right Properties Panel */}
        {rightPanel && rightOpen && (
          <aside className="w-80 border-l border-border bg-surface flex flex-col min-w-[300px] z-10 animate-in slide-in-from-right duration-200">
            {rightPanel}
          </aside>
        )}
      </div>
    </div>
  );
};
