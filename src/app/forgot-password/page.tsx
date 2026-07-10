"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = (await res.json().catch(() => ({}))) as { error?: string; success?: boolean };

      if (!res.ok) {
        setError(data.error || "Unable to process password reset request.");
        setIsLoading(false);
        return;
      }

      setIsSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred while requesting a reset.");
    } finally {
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
          <h2 className="font-h2 font-bold text-foreground">Reset Password</h2>
          <p className="text-xs text-muted">
            Enter your email address and we will send a secure reset link to help you regain access.
          </p>
        </div>

        {error && <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">{error}</div>}

        {!isSubmitted ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Button type="submit" className="w-full mt-2" isLoading={isLoading}>
              Send Reset Link
            </Button>
          </form>
        ) : (
          <div className="border border-accent/20 bg-accent-muted rounded-lg p-5 space-y-3.5 text-left">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/20 text-accent">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <h4 className="text-xs font-bold uppercase text-accent tracking-wide">Secure Recovery</h4>
            <p className="text-xs text-muted leading-relaxed">
              If <strong className="text-foreground">{email}</strong> belongs to a registered account, a password reset link has been sent to that email address.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
