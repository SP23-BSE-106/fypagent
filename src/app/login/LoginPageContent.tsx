"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Cpu } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function LoginPageContent() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const isVerified = searchParams.get("verified") === "1";
  const isReset = searchParams.get("reset") === "1";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        success?: boolean;
      };

      if (!res.ok) {
        setError(data.error || "Login failed");
        setIsLoading(false);
        return;
      }

      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsLoading(false);
    }
  };

  return (
<div className="min-h-screen w-screen flex bg-[#0B0F14] text-foreground select-none overflow-x-hidden overflow-y-auto">
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 md:px-24 bg-[#0B0F14] z-10 border-r border-border/40">
        <div className="mx-auto w-full max-w-sm space-y-8">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5">
              <Image
                src="/logo1.png"
                alt="AgentFlow"
                width={40}
                height={40}
                className="h-10 w-10 rounded-lg overflow-hidden"
              />
              <span className="text-base font-extrabold tracking-tight">AgentFlow</span>
            </Link>
          </div>

          <div className="space-y-2">
            <h2 className="font-h2 font-bold text-foreground">Welcome Back</h2>
            <p className="text-xs text-muted">Log in to manage your agent orchestration workspace.</p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs" role="alert">
              {error}
            </div>
          )}

          {(isVerified || isReset) && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
              {isReset
                ? "Password reset successfully. Please sign in with your new password."
                : "Email verified successfully. Please sign in."}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Password"
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              showPasswordToggle
              helperText="For best security, use a strong password."
            />
            <div className="flex justify-end -mt-3">
              <Link href="/forgot-password" className="text-[11px] text-accent hover:underline font-semibold">
                Forgot Password?
              </Link>
            </div>
            <Button type="submit" className="w-full mt-2" isLoading={isLoading}>
              Sign In to Workspace
            </Button>
          </form>

          <p className="text-xs text-muted text-center">
            Do not have an account?{" "}
            <Link href="/signup" className="text-accent hover:underline font-semibold">
              Create one now
            </Link>
          </p>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 flex-col items-center justify-center p-12 bg-linear-to-tr from-[#131A23] to-[#0B0F14] relative overflow-hidden">
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(circle_at_center,var(--accent)_1px,transparent_1px)] bg-size-[20px_20px]" />
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-accent/5 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-accent/5 blur-3xl" />
        <div className="max-w-md text-left space-y-6 relative z-10">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent-muted text-accent">
            <Cpu className="h-5 w-5" />
          </div>
          <blockquote className="space-y-4">
            <p className="font-h2 text-foreground font-semibold leading-relaxed">
              AgentFlow transformed our workflow structures.
            </p>
            <footer className="text-xs text-muted">
              <cite className="font-bold text-foreground not-italic">Marcus Vance</cite> - Lead AI Integration at Vercel
            </footer>
          </blockquote>
        </div>
      </div>
    </div>
  );
}

