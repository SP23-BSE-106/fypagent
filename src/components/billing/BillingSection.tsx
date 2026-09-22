"use client"

import * as React from "react"
import { CreditCard, Check, Shield, AlertCircle, Smartphone, Building2, Send } from "lucide-react"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"

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
  const [activeTab, setActiveTab] = React.useState<"stripe" | "jazzcash" | "easypaisa">("jazzcash")
  const [isRedirectingStripe, setIsRedirectingStripe] = React.useState(false)

  // Local Payment Form
  const [transactionId, setTransactionId] = React.useState("")
  const [senderPhone, setSenderPhone] = React.useState("")
  const [note, setNote] = React.useState("")
  const [isSubmittingLocal, setIsSubmittingLocal] = React.useState(false)
  const [localSuccessMsg, setLocalSuccessMsg] = React.useState("")
  const [localErrorMsg, setLocalErrorMsg] = React.useState("")

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

  const handleLocalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalSuccessMsg("")
    setLocalErrorMsg("")

    if (!transactionId.trim()) {
      setLocalErrorMsg("Please enter the Transaction ID (TRX ID).")
      return
    }

    setIsSubmittingLocal(true)

    try {
      const res = await fetch("/api/payments/local", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod: activeTab,
          transactionId,
          senderPhone,
          note,
          plan: "monthly_pro",
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to submit verification")

      setLocalSuccessMsg(data.message)
      setTransactionId("")
      setSenderPhone("")
      setNote("")
    } catch (err: any) {
      setLocalErrorMsg(err.message || "Failed to process local payment submission")
    } finally {
      setIsSubmittingLocal(false)
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
        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-4">Select Payment Method</h4>

        {/* Payment Tabs */}
        <div className="flex border-b border-border/60 mb-6 gap-2">
          <button
            onClick={() => setActiveTab("jazzcash")}
            className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === "jazzcash"
                ? "border-amber-500 text-amber-400"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            <Smartphone className="w-4 h-4" />
            JazzCash (Local PK)
          </button>
          <button
            onClick={() => setActiveTab("easypaisa")}
            className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === "easypaisa"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            <Smartphone className="w-4 h-4" />
            EasyPaisa (Local PK)
          </button>
          <button
            onClick={() => setActiveTab("stripe")}
            className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === "stripe"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Stripe (Card Payment)
          </button>
        </div>

        {/* JazzCash / EasyPaisa Form */}
        {(activeTab === "jazzcash" || activeTab === "easypaisa") && (
          <div className="space-y-6">
            <div className="p-4 rounded-lg bg-surface/50 border border-border/60 text-xs space-y-2">
              <div className="flex items-center gap-2 text-foreground font-bold">
                <Building2 className="w-4 h-4 text-accent" />
                <span>Manual Transfer Account Details ({activeTab.toUpperCase()})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div>
                  <span className="text-[10px] text-muted block">Account Title:</span>
                  <span className="font-bold text-foreground">Munazza Javed</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted block">{activeTab.toUpperCase()} Mobile Number:</span>
                  <span className="font-bold text-amber-400 font-mono">0300-1234567</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted block">Amount to Pay:</span>
                  <span className="font-bold text-emerald-400">Rs. 1,500 PKR</span>
                </div>
              </div>
            </div>

            {localSuccessMsg && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/40 rounded-lg text-emerald-300 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                <span>{localSuccessMsg}</span>
              </div>
            )}

            {localErrorMsg && (
              <div className="p-4 bg-red-500/10 border border-red-500/40 rounded-lg text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
                <span>{localErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleLocalSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Transaction ID (TRX ID)"
                  placeholder="e.g. 02938475819"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  required
                />
                <Input
                  label="Your Sender Phone Number (Optional)"
                  placeholder="03XX-XXXXXXX"
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                />
              </div>

              <Input
                label="Note / Reference (Optional)"
                placeholder="e.g. Paid via JazzCash app"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />

              <Button type="submit" isLoading={isSubmittingLocal} className="w-full sm:w-auto">
                <Send className="w-4 h-4 mr-2" />
                Submit Payment Proof for Approval
              </Button>
            </form>
          </div>
        )}

        {/* Stripe Section */}
        {activeTab === "stripe" && (
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
        )}
      </Card>
    </div>
  )
}
