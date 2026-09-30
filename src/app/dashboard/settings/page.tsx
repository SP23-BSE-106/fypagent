"use client";

import * as React from "react";
import { Key, Bell, Server, Plus, Trash2, Copy } from "lucide-react";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type SystemInfo = {
  environment: string;
  region: string | null;
  runtime: string;
  appUrl: string;
  serverTime: string;
  database: { status: "connected" } | { status: "error"; message: string };
  vectorIndex: { name: string; state: string; queryable: boolean } | null;
  embedding: { model: string; dimension: number };
};

type PersonalKey = {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
};

function CardHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="h-9.5 w-9.5 rounded-lg bg-accent-muted flex items-center justify-center text-accent">
        {icon}
      </div>
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">{title}</h3>
        <p className="text-[10px] text-muted">{subtitle}</p>
      </div>
    </div>
  );
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-border/30 last:border-0">
      <span className="text-muted shrink-0">{label}</span>
      <span className="text-foreground font-medium text-right break-all">{children}</span>
    </div>
  );
}

/** The populated System card body. Exported so it can be rendered in isolation. */
export function SystemDetails({ system }: { system: SystemInfo }) {
  const isProduction = system.environment === "production";

  return (
    <div className="text-xs">
      <MetaRow label="Environment">
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
            isProduction ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"
          }`}
        >
          {system.environment}
        </span>
      </MetaRow>
      <MetaRow label="Region">{system.region || "Local"}</MetaRow>
      <MetaRow label="Runtime">{system.runtime}</MetaRow>
      <MetaRow label="Application URL">
        <a href={system.appUrl} className="text-accent hover:underline">
          {system.appUrl}
        </a>
      </MetaRow>
      <MetaRow label="Database">
        {system.database.status === "connected" ? (
          <span className="text-emerald-400">Connected</span>
        ) : (
          <span className="text-red-400" title={system.database.message}>
            Unavailable
          </span>
        )}
      </MetaRow>
      <MetaRow label="Vector Index">
        {system.vectorIndex ? (
          system.vectorIndex.queryable ? (
            <span className="text-emerald-400" title={system.vectorIndex.name}>
              Ready
            </span>
          ) : (
            <span className="text-amber-400" title={system.vectorIndex.name}>
              {system.vectorIndex.state}
            </span>
          )
        ) : (
          <span className="text-muted">Unknown</span>
        )}
      </MetaRow>
      <MetaRow label="Embeddings">
        <span title={system.embedding.model}>{system.embedding.dimension}-dim</span>
      </MetaRow>
    </div>
  );
}

export default function SettingsPage() {
  // Personal API Keys
  const [personalKeys, setPersonalKeys] = React.useState<PersonalKey[]>([]);
  const [newKey, setNewKey] = React.useState<{ key: string; name: string } | null>(null);
  const [keyName, setKeyName] = React.useState("");
  const [isGeneratingKey, setIsGeneratingKey] = React.useState(false);
  const [keyError, setKeyError] = React.useState("");

  // Notification Preferences
  const [emailNotifications, setEmailNotifications] = React.useState(false);
  const [inAppNotifications, setInAppNotifications] = React.useState(false);
  const [isUpdatingPrefs, setIsUpdatingPrefs] = React.useState(false);
  const [prefsMessage, setPrefsMessage] = React.useState("");

  // System status
  const [system, setSystem] = React.useState<SystemInfo | null>(null);
  const [systemLoading, setSystemLoading] = React.useState(true);
  const [systemError, setSystemError] = React.useState("");

  React.useEffect(() => {
    const fetchSettings = async () => {
      const [keysRes, profileRes, systemRes] = await Promise.all([
        fetch("/api/settings/api-keys").then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch("/api/auth/profile").then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch("/api/settings/system").then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);

      if (keysRes?.keys) setPersonalKeys(keysRes.keys);

      if (profileRes?.user?.preferences) {
        setEmailNotifications(Boolean(profileRes.user.preferences.emailNotifications));
        setInAppNotifications(Boolean(profileRes.user.preferences.inAppNotifications));
      }

      if (systemRes?.system) setSystem(systemRes.system);
      else setSystemError("System status is unavailable.");
      setSystemLoading(false);
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
    } catch (err) {
      setKeyError(err instanceof Error ? err.message : "Failed to generate key");
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
    setPrefsMessage("");
    try {
      const prefs = {
        emailNotifications: type === "email" ? val : emailNotifications,
        inAppNotifications: type === "inApp" ? val : inAppNotifications,
      };

      const res = await fetch("/api/auth/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateProfile", preferences: prefs }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.error) throw new Error(data.error || "Failed to save preferences");
      setPrefsMessage("Saved.");
    } catch (err) {
      setPrefsMessage(err instanceof Error ? err.message : "Failed to save preferences");
    } finally {
      setIsUpdatingPrefs(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 select-none text-left">
        <div className="space-y-1">
          <h2 className="font-h1 font-bold text-foreground">Settings</h2>
          <p className="text-xs text-muted">System status, API access, and notification preferences.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-6">
            {/* Personal API Keys */}
            <Card className="p-6">
              <CardHeader
                icon={<Key className="h-5 w-5" />}
                title="Personal API Keys"
                subtitle="Generate keys to access the AgentFlow API programmatically."
              />

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
              <CardHeader
                icon={<Bell className="h-5 w-5" />}
                title="Notification Preferences"
                subtitle="Manage how you receive updates and alerts."
              />

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

                <div className="h-4 text-[11px] text-accent">{prefsMessage}</div>
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            {/* System */}
            <Card className="p-6">
              <CardHeader
                icon={<Server className="h-5 w-5" />}
                title="System"
                subtitle="Runtime and service status for this deployment."
              />

              {systemLoading ? (
                <p className="text-xs text-muted">Loading system status...</p>
              ) : systemError ? (
                <p className="text-xs text-red-400">{systemError}</p>
              ) : system ? (
                <SystemDetails system={system} />
              ) : null}
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
