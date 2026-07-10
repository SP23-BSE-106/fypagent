"use client";

import * as React from "react";
import { Mail, MessageSquare, Send, Check } from "lucide-react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";

export default function ContactPage() {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [subject, setSubject] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSent, setIsSent] = React.useState(false);

  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Failed to send message");
      }

      setIsSent(true);
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");

      setTimeout(() => setIsSent(false), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to send message";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16 text-left select-none space-y-12">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <h1 className="font-display text-foreground">Contact Support</h1>
          <p className="font-body text-muted text-sm leading-relaxed">
            Have questions about integrating custom REST APIs or indexing vector document memories? Drop us a line.
          </p>
        </div>

        {/* Layout grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {/* Form */}
          <Card className="md:col-span-2 p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Name"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <Input
                  label="Email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Input
                label="Subject"
                placeholder="How do I connect local Ollama models?"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
              <Textarea
                label="Message"
                placeholder="Detail query logs..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
              <Button type="submit" className="w-full" isLoading={isLoading}>
                {isSent ? (
                  <>
                    <Check className="h-4 w-4 mr-1.5" />
                    Sent Successfully!
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5 mr-1.5" />
                    Send Inquiry Message
                  </>
                )}
              </Button>

              {error && (
                <p className="text-xs text-red-400 font-medium text-center" role="alert">
                  {error}
                </p>
              )}
            </form>
          </Card>

          {/* Quick contact channels cards */}
          <div className="space-y-6">
            <Card className="p-5 flex items-start gap-4">
              <Mail className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-foreground">Email Channels</h4>
                <p className="text-[10px] text-muted">support@agentflow.ai</p>
                <p className="text-[10px] text-muted">info@agentflow.ai</p>
              </div>
            </Card>

            <Card className="p-5 flex items-start gap-4 bg-surface/30">
              <MessageSquare className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-foreground">Response Queue</h4>
                <p className="text-[10px] text-muted leading-relaxed">
                  We usually respond to all general inquires within 24 business hours.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
