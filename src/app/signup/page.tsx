'use client';
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Cpu } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className={props.className} {...props}>
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

function getRedirectToDashboard() {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/dashboard`;
  }
  return `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`;
}

export default function SignupPage() {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      });
      if (authError) {
        setError(authError.message);
        setIsLoading(false);
        return;
      }
      if (!data.session) {
        setSuccess("Check your email for confirmation link");
        setIsLoading(false);
        return;
      }
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsLoading(false);
    }
  };

  const handleGitHubSignup = async () => {
    setIsLoading(true);
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(supabaseUrl, supabaseKey);

      const redirectTo = getRedirectToDashboard();
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: { redirectTo },
      });

      if (authError) {
        setError(authError.message);
        setIsLoading(false);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setIsLoading(true);
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(supabaseUrl, supabaseKey);

      const redirectTo = getRedirectToDashboard();
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });

      if (authError) {
        setError(authError.message);
        setIsLoading(false);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-[#0B0F14] text-foreground select-none overflow-hidden">
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 md:px-24 bg-[#0B0F14] z-10 border-r border-border/40">
        <div className="mx-auto w-full max-w-sm space-y-7">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5">
              <img src="/logo1.png" alt="AgentFlow" className="h-10 w-10 rounded-lg overflow-hidden" />
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

          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" size="sm" type="button" className="w-full" onClick={handleGitHubSignup} disabled={isLoading}>
              <GithubIcon className="h-4 w-4 mr-2" />GitHub
            </Button>
            <Button variant="secondary" size="sm" type="button" className="w-full" onClick={handleGoogleSignup} disabled={isLoading}>
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
            <span className="relative bg-[#0B0F14] px-3.5 text-[10px] uppercase font-bold text-muted/80">Or sign up with</span>
          </div>

          <form onSubmit={handleSignup} className="space-y-3.5">
            <Input label="Full Name" type="text" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} required />
            <Input label="Email Address" type="email" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input label="Password" type="password" placeholder="Create a password" value={password} onChange={(e) => setPassword(e.target.value)} required showPasswordToggle />
            <div className="flex items-start mt-2">
              <input id="terms" type="checkbox" required className="h-4 w-4 rounded border-border bg-surface text-accent" />
              <label htmlFor="terms" className="ml-2.5 text-[11px] text-muted">
                I agree to the <span className="text-accent underline">Terms of Service</span> and <span className="text-accent underline">Privacy Policy</span>.
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

      <div className="hidden lg:flex flex-1 flex-col items-center justify-center p-12 bg-gradient-to-tr from-[#131A23] to-[#0B0F14] relative overflow-hidden">
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(circle_at_center,var(--accent)_1px,transparent_1px)] [background-size:20px_20px]" />
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

