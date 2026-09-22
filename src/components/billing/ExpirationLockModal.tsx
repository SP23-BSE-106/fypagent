"use client"

import * as React from "react"
import Link from "next/link"
import { Lock, AlertTriangle, ArrowRight, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/Button"

export function ExpirationLockModal() {
  const [isExpired, setIsExpired] = React.useState(false)

  React.useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch("/api/auth/profile")
        if (res.ok) {
          const data = await res.json()
          const profile = data.user
          if (!profile) return

          if (profile.subscriptionStatus === "active" || profile.subscriptionStatus === "pending_approval") {
            setIsExpired(false)
            return
          }

          const trialEnds = profile.trialEndsAt
            ? new Date(profile.trialEndsAt).getTime()
            : profile.createdAt
            ? new Date(profile.createdAt).getTime() + 90 * 24 * 60 * 60 * 1000
            : Date.now() + 90 * 24 * 60 * 60 * 1000

          if (Date.now() > trialEnds) {
            setIsExpired(true)
          }
        }
      } catch (err) {
        console.error("Failed to check subscription status:", err)
      }
    }
    checkStatus()
  }, [])

  if (!isExpired) return null

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#0D1520] border border-red-500/40 rounded-2xl p-6 shadow-2xl space-y-5 text-center relative overflow-hidden">
        <div className="h-14 w-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto">
          <Lock className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-red-400 bg-red-500/10 px-2.5 py-1 rounded-full border border-red-500/20">
            Free Access Period Concluded
          </span>
          <h3 className="text-xl font-bold text-foreground">Your 90-Day Free Trial Has Expired</h3>
          <p className="text-xs text-muted leading-relaxed">
            Your 90-day free trial period for AgentFlow has ended. To continue executing agent workflows and using canvas nodes, please upgrade to a paid plan.
          </p>
        </div>

        <div className="p-3 bg-surface/60 rounded-xl border border-border/60 text-left space-y-2 text-xs">
          <div className="flex items-center gap-2 text-emerald-400 font-bold">
            <ShieldAlert className="w-4 h-4" />
            <span>Upgrade Options Available:</span>
          </div>
          <p className="text-muted text-[11px]">
            • Pay via <strong>JazzCash / EasyPaisa</strong> (Rs. 1,500/mo)<br />
            • Pay via <strong>Credit / Debit Card</strong> ($19 USD/mo)
          </p>
        </div>

        <Link href="/dashboard/payment" className="block w-full">
          <Button className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold hover:from-emerald-400 hover:to-teal-400 border-0 py-2.5">
            <span>Upgrade Account Now</span>
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
    </div>
  )
}
