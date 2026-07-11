"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Key, Shield, Bell, Plus, Trash2, Check, Copy } from "lucide-react";


import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";



export default function SettingsPage() {
  const router = useRouter();

  // Personal API Keys
  const [personalKeys, setPersonalKeys] = React.useState<any[]>([]);
  const [newKey, setNewKey] = React.useState<{ key: string; name: string } | null>(null);
  const [keyName, setKeyName] = React.useState("");
  const [isGeneratingKey, setIsGeneratingKey] = React.useState(false);
  const [keyError, setKeyError] = React.useState("");

  // Notification Preferences
  const [emailNotifications, setEmailNotifications] = React.useState(false);
  const [inAppNotifications, setInAppNotifications] = React.useState(false);
  const [isUpdatingPrefs, setIsUpdatingPrefs] = React.useState(false);

  // Existing provider keys UI (kept as-is)
  const [geminiKey, setGeminiKey] = React.useState("");
  const [deepseekKey, setDeepseekKey] = React.useState("");
  const [openaiKey, setOpenaiKey] = React.useState("");
  const [anthropicKey, setAnthropicKey] = React.useState("");
  const [ollamaUrl, setOllamaUrl] = React.useState("http://localhost:11434");

  React.useEffect(() => {
    const fetchSettings = async () => {
      try {
        const [keysRes, profileRes] = await Promise.all([
          fetch("/api/settings/api-keys"),
          fetch("/api/auth/profile"),
        ]);
        
        if (keysRes.ok) {
          const data = await keysRes.json();
          if (data.keys) setPersonalKeys(data.keys);
        }

        if (profileRes.ok) {
          const data = await profileRes.json();
          if (data.user?.preferences) {
            setEmailNotifications(Boolean(data.user.preferences.emailNotifications));
            setInAppNotifications(Boolean(data.user.preferences.inAppNotifications));
          }
        }
      } catch (err) {
        console.error("Failed to fetch settings", err);
      }
    };
    fetchSettings();
  }, []);

  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setKeyError("");
    setNewKey(null);
    setIsGeneratingKey(true);

    try {
      const res = await fetch("/api/settings/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: keyName || "Untitled Key" }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to generate key");

      setPersonalKeys((prev) => [data.keyRecord, ...prev]);
      setNewKey({ key: data.key, name: data.keyRecord.name });
      setKeyName("");
    } catch (err: any) {
      setKeyError(err.message || "Failed to generate key");
    } finally {
      setIsGeneratingKey(false);
    }
  };

  const handleRevokeKey = async (id: string) => {
    try {
      const res = await fetch(`/api/settings/api-keys?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setPersonalKeys((prev) => prev.filter((k) => k.id !== id));
      }
    } catch (err) {
      console.error("Failed to revoke key", err);
    }
  };

  const handleTogglePreference = async (type: "email" | "inApp", val: boolean) => {
    if (type === "email") setEmailNotifications(val);
    else setInAppNotifications(val);

    setIsUpdatingPrefs(true);
    try {
      const prefs = {
        emailNotifications: type === "email" ? val : emailNotifications,
        inAppNotifications: type === "inApp" ? val : inAppNotifications,
      };

      await fetch("/api/auth/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateProfile", preferences: prefs }),
      });
    } catch (err) {
      console.error("Failed to update preferences", err);
    } finally {
      setIsUpdatingPrefs(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 select-none text-left">
        <div className="space-y-1">
          <h2 className="font-h1 font-bold text-foreground">Settings</h2>
          <p className="text-xs text-muted">Configure model provider credentials and local settings.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-6">
            {/* Personal API Keys */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-9.5 w-9.5 rounded-lg bg-accent-muted flex items-center justify-center text-accent">
                  <Key className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Personal API Keys</h3>
                  <p className="text-[10px] text-muted">Generate keys to access the AgentFlow API programmatically.</p>
                </div>
              </div>

              {keyError && <div className="text-sm text-red-500 mb-4">{keyError}</div>}

              {newKey && (
                <div className="p-4 bg-accent/10 border border-accent rounded-lg mb-6">
                  <h4 className="text-sm font-bold text-foreground mb-1">New API Key Generated: {newKey.name}</h4>
                  <p className="text-xs text-muted mb-3">Please copy this key now. You will not be able to see it again!</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-surface p-2 rounded text-xs select-all">{newKey.key}</code>
                    <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(newKey.key)}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              <form onSubmit={handleGenerateKey} className="flex gap-3 items-end mb-6">
                <div className="flex-1">
                  <Input
                    label="Key Name (Optional)"
                    placeholder="e.g. CLI tool"
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                  />
                </div>
                <Button type="submit" isLoading={isGeneratingKey}>
                  <Plus className="w-4 h-4 mr-2" />
                  Generate New Key
                </Button>
              </form>

              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-2">Active Keys ({personalKeys.length}/5)</h4>
                {personalKeys.length === 0 ? (
                  <p className="text-xs text-muted">No active API keys.</p>
                ) : (
                  personalKeys.map((key) => (
                    <div key={key.id} className="flex items-center justify-between p-3 border border-border/50 rounded-lg bg-surface/30">
                      <div>
                        <div className="text-sm font-semibold">{key.name}</div>
                        <div className="text-[10px] text-muted font-mono">{key.prefix}</div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-[10px] text-muted text-right">
                          <div>Created: {new Date(key.createdAt).toLocaleDateString()}</div>
                          <div>Last used: {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : "Never"}</div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleRevokeKey(key.id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Notification Preferences */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-9.5 w-9.5 rounded-lg bg-accent-muted flex items-center justify-center text-accent">
                  <Bell className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Notification Preferences</h3>
                  <p className="text-[10px] text-muted">Manage how you receive updates and alerts.</p>
                </div>
              </div>

              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailNotifications}
                    onChange={(e) => handleTogglePreference("email", e.target.checked)}
                    disabled={isUpdatingPrefs}
                    className="w-4 h-4 rounded border-gray-300 text-accent focus:ring-accent"
                  />
                  <div>
                    <div className="text-sm font-medium">Email Notifications</div>
                    <div className="text-xs text-muted">Receive important updates via email.</div>
                  </div>
                </label>
                
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inAppNotifications}
                    onChange={(e) => handleTogglePreference("inApp", e.target.checked)}
                    disabled={isUpdatingPrefs}
                    className="w-4 h-4 rounded border-gray-300 text-accent focus:ring-accent"
                  />
                  <div>
                    <div className="text-sm font-medium">In-App Notifications</div>
                    <div className="text-xs text-muted">Show notifications within the application dashboard.</div>
                  </div>
                </label>
              </div>
            </Card>
          </div>

          <div className="space-y-6">
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
                  showPasswordToggle
                  autoComplete="new-password"
                />
                <Input
                  label="Anthropic Access Token"
                  type="password"
                  placeholder="sk-ant-..."
                  value={anthropicKey}
                  onChange={(e) => setAnthropicKey(e.target.value)}
                  showPasswordToggle
                  autoComplete="new-password"
                />
                <Input
                  label="Google Gemini API Key"
                  type="password"
                  placeholder="AIza..."
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  showPasswordToggle
                  autoComplete="new-password"
                />
                <Input
                  label="DeepSeek API Key"
                  type="password"
                  placeholder="sk-..."
                  value={deepseekKey}
                  onChange={(e) => setDeepseekKey(e.target.value)}
                  showPasswordToggle
                  autoComplete="new-password"
                />
                <Input
                  label="Local Ollama Host Link"
                  type="text"
                  placeholder="http://localhost:11434"
                  value={ollamaUrl}
                  onChange={(e) => setOllamaUrl(e.target.value)}
                />

                <p className="text-[10px] text-muted">
                  Note: this section is not part of UC-3.
                </p>
              </div>
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
        </div>
      </div>
    </DashboardLayout>
  );
}



