'use client';

import * as React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { BillingSection } from '@/components/billing/BillingSection';

export default function PaymentPage() {
  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <BillingSection />
      </div>
    </DashboardLayout>
  );
}
