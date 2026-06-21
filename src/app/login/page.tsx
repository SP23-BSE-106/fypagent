"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Cpu, Mail, Lock } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={props.className}
    {...props}
  >
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

export default function LoginPage() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate auth token check
    setTimeout(() => {
      setIsLoading(false);
      router.push("/dashboard");
    }, 1200);
  };

  return (
    <div className="flex h-screen w-screen bg-[#0B0F14] text-foreground select-none overflow-hidden">
      {/* Left Input Form */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 md:px-24 bg-[#0B0F14] z-10 border-r border-border/40">
        <div className="mx-auto w-full max-w-sm space-y-8">
          {/* Brand header */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-8.5 w-8.5 items-center justify-center rounded-lg bg-accent text-[#0B0F14] font-bold">
                AF
              </div>
              <span className="text-base font-extrabold tracking-tight">AgentFlow</span>
            </Link>
          </div>

          <div className="space-y-2">
            <h2 className="font-h2 font-bold text-foreground">Welcome Back</h2>
            <p className="text-xs text-muted">Log in to manage your agent orchestration workspace.</p>
          </div>

          {/* Social login buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" size="sm" type="button" className="w-full">
              <GithubIcon className="h-4 w-4 mr-2" />
              GitHub
            </Button>
            <Button variant="secondary" size="sm" type="button" className="w-full">
              <svg className="h-3.5 w-3.5 mr-2 fill-current" viewBox="0 0 24 24">
                <path d="M12.24 10.285V13.4h6.887c-.648 2.41-2.519 4.13-5.136 4.13A5.71 5.71 0 0 1 8.2 11.83a5.71 5.71 0 0 1 5.79-5.7c1.55 0 2.97.58 4.07 1.54l2.427-2.427C18.9 3.86 16.59 3 14 3a8.81 8.81 0 0 0-8.9 8.83A8.81 8.81 0 0 0 14 20.66c4.61 0 8.9-3.3 8.9-8.91 0-.61-.07-1.15-.22-1.465H12.24z" />
              </svg>
              Google
            </Button>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/80" />
            </div>
            <span className="relative bg-[#0B0F14] px-3.5 text-[10px] uppercase font-bold text-muted/80">
              Or continue with
            </span>
          </div>

          {/* Traditional login form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-muted tracking-wide uppercase">Password</label>
                <Link
                  href="/forgot-password"
                  className="text-[11px] text-accent hover:underline font-semibold"
                >
                  Forgot Password?
                </Link>
              </div>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="flex w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted/60 transition-all duration-200 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30"
              />
            </div>

            <Button type="submit" className="w-full mt-2" isLoading={isLoading}>
              Sign In to Workspace
            </Button>
          </form>

          <p className="text-xs text-muted text-center">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-accent hover:underline font-semibold">
              Create one now
            </Link>
          </p>
        </div>
      </div>

      {/* Right Brand Showcase panel */}
      <div className="hidden lg:flex flex-1 flex-col items-center justify-center p-12 bg-gradient-to-tr from-[#131A23] to-[#0B0F14] relative overflow-hidden">
        {/* Decorative Grid Overlay */}
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(circle_at_center,var(--accent)_1px,transparent_1px)] [background-size:20px_20px]" />
        
        {/* Glow circles */}
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-accent/5 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-accent/5 blur-3xl" />

        <div className="max-w-md text-left space-y-6 relative z-10">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent-muted text-accent">
            <Cpu className="h-5 w-5" />
          </div>
          <blockquote className="space-y-4">
            <p className="font-h2 text-foreground font-semibold leading-relaxed">
              &ldquo;AgentFlow transformed our workflow structures. Building multi-agent support teams used to take weeks; now we orchestrate them in a single afternoon.&rdquo;
            </p>
            <footer className="text-xs text-muted">
              <cite className="font-bold text-foreground not-italic">Marcus Vance</cite> — Lead AI Integration at Vercel
            </footer>
          </blockquote>
        </div>
      </div>
    </div>
  );
}
