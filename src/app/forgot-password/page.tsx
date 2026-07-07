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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsSubmitted(true);
    }, 900);
  };

  return (
    <div className="flex h-screen w-screen bg-[#0B0F14] text-foreground select-none items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-5 bg-[radial-gradient(circle_at_center,var(--accent)_1px,transparent_1px)] bg-size-[24px_24px]" />
      
      <div className="w-full max-w-md border border-border bg-surface rounded-xl p-8 shadow-2xl relative z-10">
        {/* Back Link */}
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground transition-colors mb-6 font-semibold"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to login
        </Link>

        {/* Header */}
        <div className="space-y-2 mb-6">
          <h2 className="font-h2 font-bold text-foreground">Reset Password</h2>
          <p className="text-xs text-muted">
            For security, this workspace does not expose an unsafe password-reset flow. Enter your email and we will guide the next step securely.
          </p>
        </div>

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
              Request Recovery Help
            </Button>
          </form>
        ) : (
          <div className="border border-accent/20 bg-accent-muted rounded-lg p-5 space-y-3.5 text-left">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/20 text-accent">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <h4 className="text-xs font-bold uppercase text-accent tracking-wide">Secure Recovery</h4>
            <p className="text-xs text-muted leading-relaxed">
              If <strong className="text-foreground">{email}</strong> belongs to a registered workspace, our team will review the request and help you regain access safely. Avoid sharing your password or reset tokens.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
