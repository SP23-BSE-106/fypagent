"use client";

import * as React from "react";
import { Sliders, Key, User, Shield, Check } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function SettingsPage() {
  const [profileName, setProfileName] = React.useState("John Doe");
  const [profileEmail, setProfileEmail] = React.useState("john@agentflow.ai");
  const [openaiKey, setOpenaiKey] = React.useState("sk-proj-••••••••••••••••••••••••");
  const [anthropicKey, setAnthropicKey] = React.useState("sk-ant-••••••••••••••••••••••••");
  const [ollamaUrl, setOllamaUrl] = React.useState("http://localhost:11434");
  
  const [isSaved, setIsSaved] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
    }, 1000);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 select-none text-left">
        {/* Header */}
        <div className="space-y-1">
          <h2 className="font-h1 font-bold text-foreground">Global Settings</h2>
          <p className="text-xs text-muted">
            Configure your personal account profile, authentication keys, and LLM connection settings.
          </p>
        </div>

        <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Main settings options columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Account Profile Card */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-9.5 w-9.5 rounded-lg bg-accent-muted flex items-center justify-center text-accent">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">User Profile</h3>
                  <p className="text-[10px] text-muted">Manage your workspace account credentials.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  required
                />
                <Input
                  label="Email Address"
                  type="email"
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  required
                />
              </div>
            </Card>

            {/* Model Credentials config */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-9.5 w-9.5 rounded-lg bg-accent-muted flex items-center justify-center text-accent">
                  <Key className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Model API Providers</h3>
                  <p className="text-[10px] text-muted">Set up credentials keys for canvas processing nodes.</p>
                </div>
              </div>

              <div className="space-y-4">
                <Input
                  label="OpenAI Project Key"
                  type="password"
                  placeholder="sk-proj-..."
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                />
                <Input
                  label="Anthropic Access Token"
                  type="password"
                  placeholder="sk-ant-..."
                  value={anthropicKey}
                  onChange={(e) => setAnthropicKey(e.target.value)}
                />
                <Input
                  label="Local Ollama Host Link"
                  type="text"
                  placeholder="http://localhost:11434"
                  value={ollamaUrl}
                  onChange={(e) => setOllamaUrl(e.target.value)}
                />
              </div>
            </Card>
          </div>

          {/* Right Action panel */}
          <div className="space-y-6">
            <Card className="p-5 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Save Configuration</h4>
              <p className="text-[11px] text-muted leading-relaxed">
                Changes take effect across the active node executor instantly. Saved keys are encrypted locally on the browser.
              </p>
              <div className="h-[1px] bg-border/40 w-full" />
              <Button type="submit" className="w-full text-xs font-semibold" isLoading={isLoading}>
                {isSaved ? (
                  <>
                    <Check className="h-4 w-4 mr-1.5" />
                    Saved Successfully!
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </Card>

            <Card className="p-5 bg-surface/30 space-y-3 flex items-start gap-3">
              <Shield className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h5 className="text-xs font-bold text-foreground">Local Encryption</h5>
                <p className="text-[10px] text-muted leading-normal">
                  AgentFlow stores secret tokens locally and never transmits them to external staging servers.
                </p>
              </div>
            </Card>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
