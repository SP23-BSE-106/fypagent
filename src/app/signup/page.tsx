'use client';
import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Cpu } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function SignupPage() {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");
  const router = useRouter();

  const passwordRequirements = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "One uppercase letter", met: /[A-Z]/.test(password) },
    { label: "One number", met: /\d/.test(password) },
    { label: "One special character", met: /[^A-Za-z0-9]/.test(password) },
  ];

  const validatePassword = () => {
    const isStrong = password.length >= 8 && /[A-Z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password);
    if (!isStrong) {
      setError("Use a stronger password with at least 8 characters, uppercase, a number, and a special character.");
      return false;
    }
    return true;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    if (!validatePassword()) {
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password, fullName: name }),
      })

      const data = (await res.json().catch(() => ({}))) as { error?: string; success?: boolean }

      if (!res.ok) {
        setError(data.error || 'Signup failed')
        setIsLoading(false)
        return
      }

      router.push('/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setIsLoading(false)
    }
  };

  return (
    <div className="flex h-screen w-screen bg-[#0B0F14] text-foreground select-none overflow-hidden">
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 md:px-24 bg-[#0B0F14] z-10 border-r border-border/40">
        <div className="mx-auto w-full max-w-sm space-y-7">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5">
              <Image src="/logo1.png" alt="AgentFlow" width={40} height={40} className="h-10 w-10 rounded-lg overflow-hidden" />
              <span className="text-base font-extrabold tracking-tight">AgentFlow</span>
            </Link>
          </div>

          <div className="space-y-1.5">
            <h2 className="font-h2 font-bold text-foreground">Create Account</h2>
            <p className="text-xs text-muted">Join the next-generation multi-agent orchestra.</p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">{error}</div>
          )}
          {success && (
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-xs">{success}</div>
          )}

          <form onSubmit={handleSignup} className="space-y-3.5">
            <Input label="Full Name" type="text" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} required />
            <Input label="Email Address" type="email" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input label="Password" type="password" placeholder="Create a password" value={password} onChange={(e) => setPassword(e.target.value)} required showPasswordToggle helperText="Use a strong password for safer access to your workspace." />
            <div className="rounded-lg border border-border/60 bg-surface/50 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">Password requirements</p>
              <ul className="mt-2 space-y-1 text-[11px] text-muted">
                {passwordRequirements.map((rule) => (
                  <li key={rule.label} className={rule.met ? "text-emerald-400" : "text-muted"}>• {rule.label}</li>
                ))}
              </ul>
            </div>
            <div className="flex items-start mt-2">
              <input id="terms" type="checkbox" required className="h-4 w-4 rounded border-border bg-surface text-accent" />
              <label htmlFor="terms" className="ml-2.5 text-[11px] text-muted">
                I agree to the{" "}
                <Link href="/terms" className="text-accent underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-accent underline">
                  Privacy Policy
                </Link>
                .
              </label>
            </div>
            <Button type="submit" className="w-full mt-2" isLoading={isLoading}>
              Create Free Workspace
            </Button>
          </form>

          <p className="text-xs text-muted text-center">
            Already have an account? <Link href="/login" className="text-accent hover:underline font-semibold">Sign In instead</Link>
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
          <div className="space-y-4">
            <h3 className="font-h2 font-bold text-foreground leading-snug">Establish Your Agent Infrastructure First.</h3>
            <p className="text-xs text-muted leading-relaxed">Do not build fragmented code pages. Set up nodes, custom memory modules, RAG schemas, and deployment integrations inside our visual, unified flow dashboard.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

