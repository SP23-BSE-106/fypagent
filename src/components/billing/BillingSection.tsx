"use client"

import * as React from "react"
import { CreditCard, Check } from "lucide-react"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"

export function BillingSection() {
  // Session return & status check
  const [verifyingSession, setVerifyingSession] = React.useState(false)
  const [sessionSuccessMsg, setSessionSuccessMsg] = React.useState("")
  const [profile, setProfile] = React.useState<any>(null)

  const fetchProfile = React.useCallback(async () => {
    try {
      const res = await fetch("/api/auth/profile")
      if (res.ok) {
        const data = await res.json()
        setProfile(data.user || null)
      }
    } catch (err) {
      console.error("Error fetching profile:", err)
    }
  }, [])

  React.useEffect(() => {
    fetchProfile()

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      const sessionId = params.get("session_id")
      const success = params.get("success")

      if (sessionId && success === "true") {
        setVerifyingSession(true)
        fetch("/api/payments/verify-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              setSessionSuccessMsg(data.message)
              fetchProfile()
            }
          })
          .catch((err) => console.error("Session verification error:", err))
          .finally(() => setVerifyingSession(false))
      }
    }
  }, [fetchProfile])

  const [isRedirectingStripe, setIsRedirectingStripe] = React.useState(false)

  const handleStripeCheckout = async () => {
    setIsRedirectingStripe(true)
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "subscription" }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error || "Failed to initiate Stripe Checkout")
      }
    } catch (err: any) {
      alert("Error connecting to checkout server: " + err.message)
    } finally {
      setIsRedirectingStripe(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Billing & Subscriptions</h3>
          <p className="text-xs text-muted">Manage your payment methods, 90-day trial status, and plan upgrades.</p>
        </div>
      </div>

      {sessionSuccessMsg && (
        <div className="p-4 bg-emerald-500/15 border border-emerald-500/40 rounded-xl text-emerald-200 text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Check className="w-4 h-4" />
            </div>
            <div>
              <h5 className="font-bold text-emerald-300">Payment Successfully Verified!</h5>
              <p className="text-emerald-200/80 mt-0.5">{sessionSuccessMsg}</p>
            </div>
          </div>
        </div>
      )}

      {profile?.subscriptionStatus === "active" && (
        <div className="p-4 bg-gradient-to-r from-emerald-950/90 to-teal-900/90 border border-emerald-500/40 rounded-xl text-emerald-100 text-xs flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
              <Check className="w-4 h-4" />
            </div>
            <div>
              <h5 className="font-bold text-emerald-300">Active Pro Plan Subscription</h5>
              <p className="text-emerald-200/80 mt-0.5">
                Your payment is saved for <strong className="text-white">{profile.email}</strong>. You have full, unrestricted access to all services for 30 days!
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500 text-slate-950 px-2.5 py-1 rounded-md">
            Active
          </span>
        </div>
      )}

      {/* Pricing Tiers Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Free Trial Tier */}
        <Card className="p-6 border-border/60 bg-surface/30 relative">
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="text-[10px] uppercase font-bold text-accent tracking-wider bg-accent/10 px-2 py-0.5 rounded">Current Plan</span>
              <h4 className="text-lg font-bold text-foreground mt-1">90-Day Free Trial</h4>
            </div>
            <div className="text-right">
              <span className="text-2xl font-extrabold text-foreground">Rs. 0</span>
              <span className="text-xs text-muted"> / 90 Days</span>
            </div>
          </div>
          <p className="text-xs text-muted mb-4">Full access to agent creator, canvas execution nodes, and templates for 90 days.</p>
          <ul className="space-y-2 text-xs text-muted mb-6">
            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-accent" /> Create Unlimited AI Agents</li>
            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-accent" /> Canvas Workflow Builder</li>
            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-accent" /> RAG Knowledgebase Engine</li>
          </ul>
        </Card>

        {/* Pro Tier */}
        <Card className="p-6 border-accent/50 bg-gradient-to-b from-accent/5 to-transparent relative shadow-lg">
          <div className="absolute -top-3 right-6 bg-accent text-slate-950 font-extrabold text-[10px] uppercase px-2.5 py-0.5 rounded-full shadow">
            Recommended
          </div>
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Unlimited Access</span>
              <h4 className="text-lg font-bold text-foreground mt-1">AgentFlow Pro</h4>
            </div>
            <div className="text-right">
              <span className="text-2xl font-extrabold text-foreground">Rs. 1,500</span>
              <span className="text-xs text-muted"> / month</span>
            </div>
          </div>
          <p className="text-xs text-muted mb-4">Keep full access after 90 days. Includes priority execution & API endpoints.</p>
          <ul className="space-y-2 text-xs text-muted mb-6">
            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> All Free Trial Features</li>
            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Priority Node Processing</li>
            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Continuous Monthly Updates</li>
          </ul>
        </Card>
      </div>

      {/* Payment Selection Box */}
      <Card className="p-6 border-border/80">
        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-4">Payment Method</h4>

        {/* Stripe Section */}
        <div className="space-y-4 text-xs">
          <p className="text-muted">
            Pay securely via international Credit / Debit cards using Stripe Checkout test mode.
          </p>
          <div className="p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-lg text-indigo-200">
            <span className="font-bold">Test Mode Active:</span> You can test checkout with test card number <code className="bg-surface px-1.5 py-0.5 rounded font-mono text-indigo-300">4242 4242 4242 4242</code>.
          </div>

          <Button onClick={handleStripeCheckout} isLoading={isRedirectingStripe} className="bg-indigo-600 hover:bg-indigo-500">
            <CreditCard className="w-4 h-4 mr-2" />
            Proceed to Stripe Checkout ($19 USD)
          </Button>
        </div>
      </Card>
    </div>
  )
}
