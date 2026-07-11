"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, User, Shield, Lock } from "lucide-react";


import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type ProfileResponse = {
  user?: {
    id: string;
    email?: string;
    fullName?: string;
    avatarUrl?: string | null;
    preferences?: Record<string, any>;
    emailVerified?: boolean;
  };
};

type Preferences = {
  marketingEmails?: boolean;
};

export default function ProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = React.useState(true);

  const [profileName, setProfileName] = React.useState("");
  const [profileEmail, setProfileEmail] = React.useState("");
  const [avatarBase64, setAvatarBase64] = React.useState<string>("");
  const [preferences, setPreferences] = React.useState<Preferences>({ marketingEmails: false });

  // Manage Profile
  const [isSaving, setIsSaving] = React.useState(false);
  const [isSaved, setIsSaved] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState<string>("");
  const [statusError, setStatusError] = React.useState<string>("");

  // Change Password
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [isChangingPassword, setIsChangingPassword] = React.useState(false);
  const [passwordStatusMessage, setPasswordStatusMessage] = React.useState("");
  const [passwordStatusError, setPasswordStatusError] = React.useState("");
  React.useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/auth/profile");
        const data = (await res.json().catch(() => ({}))) as ProfileResponse;

        if (!data.user) {
          router.push("/login");
          return;
        }

        setProfileName(data.user.fullName || "");
        setProfileEmail(data.user.email || "");
        setAvatarBase64(data.user.avatarUrl || "");
        setPreferences({ marketingEmails: Boolean(data.user.preferences?.marketingEmails) });
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  const fileToBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.onload = () => resolve(String(reader.result || ""));
      reader.readAsDataURL(file);
    });

  const refreshProfile = async () => {
    const res = await fetch("/api/auth/profile");
    const data = (await res.json().catch(() => ({}))) as ProfileResponse;
    if (!data.user) return;

    setProfileName(data.user.fullName || "");
    setProfileEmail(data.user.email || "");
    setAvatarBase64(data.user.avatarUrl || "");
    setPreferences({ marketingEmails: Boolean(data.user.preferences?.marketingEmails) });
  };


  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusError("");
    setStatusMessage("");
    setIsSaving(true);

    try {
      const nextAvatar = avatarBase64;

      const res = await fetch("/api/auth/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateProfile",
          fullName: profileName,
          email: profileEmail,
          avatarBase64: nextAvatar || undefined,
          preferences,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as any;

      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to save profile");
      }

      if (data.emailChangePendingVerification) {
        setStatusMessage(data.message || "Email changed. Verify your new email address.");
      } else {
        setStatusMessage("Profile updated successfully.");
      }

      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);

      await refreshProfile();
    } catch (err: any) {
      setStatusError(err?.message || "Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatusError("");
    setPasswordStatusMessage("");
    
    if (newPassword !== confirmPassword) {
      setPasswordStatusError("New passwords do not match.");
      return;
    }

    setIsChangingPassword(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = (await res.json().catch(() => ({}))) as any;

      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to change password");
      }

      setPasswordStatusMessage("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordStatusError(err?.message || "Failed to change password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const onAvatarFileChange = async (file: File | null) => {
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setStatusError("Avatar must be under 2MB");
      return;
    }

    const isPng = file.type === "image/png";
    const isJpg = file.type === "image/jpeg" || file.type === "image/jpg";
    if (!isPng && !isJpg) {
      setStatusError("Avatar must be JPG or PNG");
      return;
    }

    setStatusError("");
    setStatusMessage("");

    const b64 = await fileToBase64(file);
    setAvatarBase64(b64);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted text-xs">Loading...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 select-none text-left">
        <div className="space-y-1">
          <h2 className="font-h1 font-bold text-foreground">Manage Profile</h2>
          <p className="text-xs text-muted">Update your profile information and preferences.</p>
        </div>

        {statusError ? <div className="text-sm text-red-500">{statusError}</div> : null}
        {!statusError && statusMessage ? (
          <div className="text-sm text-accent">{statusMessage}</div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-9.5 w-9.5 rounded-lg bg-accent-muted flex items-center justify-center text-accent">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">User Profile</h3>
                  <p className="text-[10px] text-muted">Name, email, avatar, and account preferences.</p>
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

              <div className="mt-5 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-foreground">Avatar</div>
                <div className="flex items-start gap-4">
                  <div>
                    <div className="h-16 w-16 rounded-lg bg-surface/30 overflow-hidden flex items-center justify-center">
                      {avatarBase64 ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={avatarBase64} alt="avatar" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-muted text-xs">No image</span>
                      )}
                    </div>
                  </div>

                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      className="block w-full text-xs text-muted"
                      onChange={(e) => onAvatarFileChange(e.target.files?.[0] || null)}
                    />
                    <p className="text-[10px] text-muted mt-1">Max 2MB. JPG/PNG only.</p>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <div className="text-xs font-bold uppercase tracking-wider text-foreground">Account Preferences</div>
                <label className="mt-3 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={Boolean(preferences.marketingEmails)}
                    onChange={(e) => setPreferences((p) => ({ ...p, marketingEmails: e.target.checked }))}
                  />
                  <span className="text-xs text-muted">Marketing emails</span>
                </label>
              </div>
            </Card>

            <form onSubmit={handleSaveProfile}>
              <Card className="p-5 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Save Profile</h4>
                <p className="text-[11px] text-muted leading-relaxed">
                  Non-email changes reflect immediately. Email changes require re-verification.
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
            </form>


          </div>

          <div className="space-y-6">
            <Card className="p-5 bg-surface/30 space-y-3 flex items-start gap-3">
              <Shield className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h5 className="text-xs font-bold text-foreground">Local Encryption</h5>
                <p className="text-[10px] text-muted leading-normal">
                  AgentFlow stores secret tokens locally and never transmits them to external staging servers.
                </p>
              </div>
            </Card>

            <form onSubmit={handleChangePassword}>
              <Card className="p-5 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="h-4 w-4 text-muted" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Change Password</h4>
                </div>
                
                {passwordStatusError ? <div className="text-xs text-red-500">{passwordStatusError}</div> : null}
                {!passwordStatusError && passwordStatusMessage ? (
                  <div className="text-xs text-accent">{passwordStatusMessage}</div>
                ) : null}

                <div className="space-y-3">
                  <Input
                    label="Current Password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                  <Input
                    label="New Password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  <Input
                    label="Confirm New Password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="h-[1px] bg-border/40 w-full mt-4 mb-2" />
                <Button type="submit" className="w-full text-xs font-semibold" isLoading={isChangingPassword}>
                  Update Password
                </Button>
              </Card>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

