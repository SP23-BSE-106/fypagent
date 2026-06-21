"use client";

import * as React from "react";
import Link from "next/link";
import { Navbar } from "@/components/ui/Navbar";

export const PublicLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Navigation Header */}
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-grow">{children}</main>

      {/* Public Footer */}
      <footer className="border-t border-border/80 bg-surface/30 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-[#0B0F14] font-bold">
                  AF
                </div>
                <span className="text-base font-bold text-foreground">AgentFlow</span>
              </div>
              <p className="text-xs text-muted max-w-xs">
                Next-generation orchestration platform to design, test, and deploy collaborative multi-agent teams.
              </p>
            </div>
            
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-4">Product</h4>
              <ul className="space-y-2 text-xs">
                <li><Link href="/workflow-builder" className="text-muted hover:text-accent transition-colors">Workflow Builder</Link></li>
                <li><Link href="/testing-sandbox" className="text-muted hover:text-accent transition-colors">Testing Sandbox</Link></li>
                <li><Link href="/dashboard/templates" className="text-muted hover:text-accent transition-colors">Templates</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-4">Resources</h4>
              <ul className="space-y-2 text-xs">
                <li><Link href="/docs" className="text-muted hover:text-accent transition-colors">API Docs</Link></li>
                <li><Link href="/about" className="text-muted hover:text-accent transition-colors">About Us</Link></li>
                <li><Link href="/contact" className="text-muted hover:text-accent transition-colors">Contact Support</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-4">Legal</h4>
              <ul className="space-y-2 text-xs">
                <li><span className="text-muted">Privacy Policy</span></li>
                <li><span className="text-muted">Terms of Service</span></li>
                <li><span className="text-muted">License Agreement</span></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-border/40 mt-8 pt-8 flex flex-col md:flex-row items-center justify-between text-xs text-muted gap-4">
            <span>&copy; {new Date().getFullYear()} AgentFlow Inc. All rights reserved.</span>
            <div className="flex gap-4">
              <span className="hover:text-foreground cursor-pointer">Twitter</span>
              <span className="hover:text-foreground cursor-pointer">GitHub</span>
              <span className="hover:text-foreground cursor-pointer">Discord</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
