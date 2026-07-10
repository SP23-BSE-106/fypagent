"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function ResetPasswordPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Missing reset token.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = (await res.json().catch(() => ({}))) as { error?: string; success?: boolean };

      if (!res.ok) {
        setError(data.error || "Unable to reset password.");
        setIsLoading(false);
        return;
      }

      router.push("/login?reset=1");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred while resetting your password.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0B0F14] text-foreground select-none items-center justify-center p-4 overflow-x-hidden">
      <div className="absolute inset-0 opacity-5 bg-[radial-gradient(circle_at_center,var(--accent)_1px,transparent_1px)] bg-size-[24px_24px]" />

      <div className="w-full max-w-md border border-border bg-surface rounded-xl p-8 shadow-2xl relative z-10">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground transition-colors mb-6 font-semibold"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to login
        </Link>

        <div className="space-y-2 mb-6">
          <h2 className="font-h2 font-bold text-foreground">Create New Password</h2>
          <p className="text-xs text-muted">
            Choose a strong password to secure your account.
          </p>
        </div>

        {error && <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="New Password"
            type="password"
            placeholder="Enter new password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            showPasswordToggle
          />
          <Input
            label="Confirm Password"
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            showPasswordToggle
          />
          <Button type="submit" className="w-full mt-2" isLoading={isLoading}>
            Reset Password
          </Button>
        </form>

        <div className="mt-6 flex items-center gap-2 rounded-lg border border-accent/20 bg-accent-muted p-3 text-xs text-muted">
          <ShieldCheck className="h-4 w-4 text-accent" />
          Use at least 8 characters, one uppercase letter, one number, and one special character.
        </div>
      </div>
    </div>
  );
}
