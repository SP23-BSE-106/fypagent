"use client";

import * as React from "react";
import { PublicLayout } from "@/components/layout/PublicLayout";

export default function TermsPage() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-16">
        <h1 className="text-3xl sm:text-4xl font-black text-white mb-6">Terms of Service</h1>
        <p className="text-sm text-muted mb-8">
          Last updated: <span className="text-foreground">2026-01-01</span>
        </p>

        <section className="space-y-6 text-sm text-white/70 leading-relaxed">
          <div>
            <h2 className="text-base font-bold text-white mb-2">1. Acceptance</h2>
            <p>
              By accessing and using AgentFlow, you agree to these Terms of Service. If you do not
              agree, do not use the service.
            </p>
          </div>

          <div>
            <h2 className="text-base font-bold text-white mb-2">2. Use of the Service</h2>
            <p>
              You are responsible for your account and for all activities conducted under your
              account. You agree not to misuse the service or attempt to disrupt it.
            </p>
          </div>

          <div>
            <h2 className="text-base font-bold text-white mb-2">3. Content &amp; Conduct</h2>
            <p>
              You must ensure that any content you upload or generate using AgentFlow complies with
              applicable laws.
            </p>
          </div>

          <div>
            <h2 className="text-base font-bold text-white mb-2">4. Limitation of Liability</h2>
            <p>
              AgentFlow is provided “as is”. To the maximum extent permitted by law, AgentFlow
              will not be liable for any indirect, incidental, or consequential damages.
            </p>
          </div>

          <div>
            <h2 className="text-base font-bold text-white mb-2">5. Changes</h2>
            <p>
              We may update these Terms from time to time. Continued use after changes means you
              accept the updated Terms.
            </p>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
