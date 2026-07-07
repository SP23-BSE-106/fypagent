"use client";

import * as React from "react";
import { PublicLayout } from "@/components/layout/PublicLayout";

export default function PrivacyPage() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-16">
        <h1 className="text-3xl sm:text-4xl font-black text-white mb-6">Privacy Policy</h1>
        <p className="text-sm text-muted mb-8">
          Last updated: <span className="text-foreground">{new Date().toLocaleDateString()}</span>
        </p>

        <section className="space-y-6 text-sm text-white/70 leading-relaxed">
          <div>
            <h2 className="text-base font-bold text-white mb-2">1. Information We Collect</h2>
            <p>
              We may collect information you provide when creating an account, submitting requests,
              or using AgentFlow features.
            </p>
          </div>

          <div>
            <h2 className="text-base font-bold text-white mb-2">2. How We Use Information</h2>
            <p>
              We use collected information to operate the service, improve performance, and provide
              customer support.
            </p>
          </div>

          <div>
            <h2 className="text-base font-bold text-white mb-2">3. Data Sharing</h2>
            <p>
              We do not sell your personal information. We may share information with trusted partners
              to deliver the service and support infrastructure.
            </p>
          </div>

          <div>
            <h2 className="text-base font-bold text-white mb-2">4. Security</h2>
            <p>
              We implement reasonable security measures to protect your information. However, no
              method of transmission or storage is 100% secure.
            </p>
          </div>

          <div>
            <h2 className="text-base font-bold text-white mb-2">5. Contact</h2>
            <p>
              If you have questions about this Privacy Policy, please contact us via the contact page.
            </p>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
