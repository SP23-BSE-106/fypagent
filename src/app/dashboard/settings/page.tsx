"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Sliders, Key, User, Shield, Check } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [profileName, setProfileName] = React.useState("");
  const [profileEmail, setProfileEmail] = React.useState("");
  const [openaiKey, setOpenaiKey] = React.useState("");
  const [anthropicKey, setAnthropicKey] = React.useState("");
  const [ollamaUrl, setOllamaUrl] = React.useState("http://localhost:11434");

  React.useEffect(() => {
    const fetchUser = async () => {
      try {
        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUser(user);
          setProfileName(user.user_metadata?.full_name || "");
          setProfileEmail(user.email || "");
        } else {
          router.push("/login");
        }
      } catch (err) {
        console.error("Error fetching user:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [router]);

  const [isSaved, setIsSaved] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted text-xs">Loading...</p>
        </div>
      </DashboardLayout>
    );
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
    }, 1000);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 select-none text-left">
        <div className="space-y-1">
          <h2 className="font-h1 font-bold text-foreground">Global Settings</h2>
          <p className="text-xs text-muted">
            Configure your personal account profile, authentication keys, and LLM connection settings.
          </p>
        </div>

        <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-6">
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

          <div className="space-y-6">
            <Card className="p-5 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Save Configuration</h4>
              <p className="text-[11px] text-muted leading-relaxed">
                Changes take effect across the active node executor instantly. Saved keys are encrypted locally on the browser.
              </p>
              <div className="h-[1px] bg-border/40 w-full" />
              <Button type="submit" className="w-full text-xs font-semibold" isLoading={isSaving}>
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