"use client"

import * as React from "react"
import Link from "next/link"
import { Clock, Zap, ArrowRight, CheckCircle2 } from "lucide-react"

interface UserSubscriptionProfile {
  createdAt?: string
  trialEndsAt?: string
  subscriptionStatus?: string
  subscriptionPlan?: string
}

export function TrialBanner() {
  const [profile, setProfile] = React.useState<UserSubscriptionProfile | null>(null)

  React.useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/auth/profile")
        if (res.ok) {
          const data = await res.json()
          setProfile(data.user || null)
        }
      } catch (err) {
        console.error("Failed to fetch user profile for trial banner", err)
      }
    }
    fetchProfile()
  }, [])

  if (!profile) return null

  const isPro = profile.subscriptionStatus === "active"
  const isPending = profile.subscriptionStatus === "pending_approval"

  if (isPro) return null

  // Calculate days remaining in 90-day trial
  const trialEnds = profile.trialEndsAt
    ? new Date(profile.trialEndsAt).getTime()
    : profile.createdAt
    ? new Date(profile.createdAt).getTime() + 90 * 24 * 60 * 60 * 1000
    : Date.now() + 90 * 24 * 60 * 60 * 1000

  const now = Date.now()
  const diffTime = trialEnds - now
  const daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
  const isExpired = daysLeft <= 0

  return (
    <div className="w-full bg-gradient-to-r from-emerald-950/80 via-teal-900/60 to-cyan-950/80 border-b border-emerald-500/30 px-6 py-2.5 flex items-center justify-between text-xs text-emerald-100 shadow-md backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="h-6 w-6 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
          {isPending ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
        </div>

        {isPending ? (
          <div>
            <span className="font-semibold text-emerald-200">Payment Verification Pending: </span>
            <span className="text-emerald-300/80">Your payment proof is under review. Full access is unlocked.</span>
          </div>
        ) : isExpired ? (
          <div>
            <span className="font-bold text-red-300">90-Day Free Trial Expired: </span>
            <span className="text-emerald-200/90">Please upgrade your plan to continue running canvas nodes & workflows.</span>
          </div>
        ) : (
          <div>
            <span className="font-bold text-emerald-300">90-Day Free Trial Active: </span>
            <span className="text-emerald-200/90">
              You have <strong className="text-emerald-100 font-extrabold underline decoration-emerald-400">{daysLeft} days remaining</strong> of full free access.
            </span>
          </div>
        )}
      </div>

      <Link
        href="/dashboard/payment"
        className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-md shadow-sm transition-all duration-150 group"
      >
        <span>{isPending ? "View Status" : "Upgrade Plan"}</span>
        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
      </Link>
    </div>
  )
}
