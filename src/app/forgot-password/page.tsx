"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setIsSubmitted(true);
    }, 1200);
  };

  return (
    <div className="flex h-screen w-screen bg-[#0B0F14] text-foreground select-none items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-5 bg-[radial-gradient(circle_at_center,var(--accent)_1px,transparent_1px)] [background-size:24px_24px]" />
      
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
            Enter your workspace email and we&apos;ll send you instructions to reset your password.
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
              Send Recovery Link
            </Button>
          </form>
        ) : (
          <div className="border border-accent/20 bg-accent-muted rounded-lg p-5 space-y-3.5 text-left">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/20 text-accent">
              <Mail className="h-4 w-4" />
            </div>
            <h4 className="text-xs font-bold uppercase text-accent tracking-wide">Check Your Inbox</h4>
            <p className="text-xs text-muted leading-relaxed">
              We have dispatched password reset instructions to <strong className="text-foreground">{email}</strong>. Please check your junk or spam folders if you do not receive it in a few minutes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
