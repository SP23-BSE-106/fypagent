'use client';
import * as React from 'react';
import { CreditCard, Check, Shield, Trash2, Plus, Zap, Crown, Building } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';

const plans = [
  { name: 'Starter', price: '$0', period: 'forever', features: ['5 agents', 'Basic workflows', 'Email support'], icon: Zap },
  { name: 'Pro', price: '$29', period: 'month', features: ['25 agents', 'Advanced workflows', 'Priority support'], icon: Crown, popular: true },
  { name: 'Enterprise', price: 'Custom', period: '', features: ['Unlimited agents', 'Custom integrations', 'Dedicated support'], icon: Building },
];

export default function PaymentPage() {
  const [plan, setPlan] = React.useState('Pro');
  const [showAddCard, setShowAddCard] = React.useState(false);

  return (
    <DashboardLayout>
      <div className='max-w-5xl mx-auto space-y-8'>
        <div className='text-center space-y-2'>
          <div className='inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/25 mb-3'>
            <CreditCard className='w-6 h-6 text-white' />
          </div>
          <h1 className='text-2xl font-bold'>Upgrade Your Plan</h1>
          <p className='text-sm text-muted'>Choose the perfect plan for your needs</p>
        </div>

        <Card className='p-5 bg-gradient-to-r from-surface to-surface/50'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-4'>
              <div className='h-12 w-12 bg-emerald-500/20 rounded-xl flex items-center justify-center'>
                <CreditCard className='h-6 w-6 text-emerald-500' />
              </div>
              <div>
                <p className='text-xs text-muted uppercase tracking-wider'>Current Plan</p>
                <div className='flex items-center gap-2 mt-1'>
                  <h3 className='text-xl font-bold'>{plan}</h3>
                  <Badge variant='secondary' className='bg-emerald-500/20 text-emerald-400 border-0'>Active</Badge>
                </div>
              </div>
            </div>
            <Button variant='outline'>Manage Subscription</Button>
          </div>
        </Card>

        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          {plans.map((p) => {
            const Icon = p.icon;
            return (
              <Card key={p.name} className={'p-5 relative ' + (p.popular ? 'border-emerald-500 shadow-lg shadow-emerald-500/10' : '')}>
                {p.popular && <Badge className='absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0 text-xs'>Most Popular</Badge>}
                <div className='space-y-4'>
                  <div className='flex items-center gap-3'>
                    <div className={'h-10 w-10 rounded-xl flex items-center justify-center ' + (p.popular ? 'bg-emerald-500/20' : 'bg-surface')}>
                      <Icon className={'w-5 h-5 ' + (p.popular ? 'text-emerald-400' : 'text-muted')} />
                    </div>
                    <div>
                      <h4 className='font-semibold'>{p.name}</h4>
                      <div className='flex items-baseline gap-1'>
                        <span className='text-2xl font-bold'>{p.price}</span>
                        {p.period && <span className='text-xs text-muted'>/{p.period}</span>}
                      </div>
                    </div>
                  </div>
                  <ul className='space-y-2'>
                    {p.features.map((f, i) => (
                      <li key={i} className='flex items-center gap-2 text-sm'>
                        <Check className='w-4 h-4 text-emerald-500 flex-shrink-0' />
                        <span className='text-muted-foreground'>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button variant={plan === p.name ? 'secondary' : 'default'} className={p.popular ? 'w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border-0' : 'w-full'}>
                    {plan === p.name ? 'Current Plan' : p.name === 'Enterprise' ? 'Contact Sales' : 'Upgrade'}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        <div className='space-y-4'>
          <div className='flex items-center justify-between'>
            <h3 className='text-lg font-semibold'>Payment Methods</h3>
            <Button variant='ghost' onClick={() => setShowAddCard(!showAddCard)} className='text-emerald-500 hover:text-emerald-400'>
              <Plus className='w-4 h-4 mr-1' />Add Card
            </Button>
          </div>

          {showAddCard && (
            <Card className='p-5 border-emerald-500/30 bg-emerald-500/5'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <Input label='Card Number' placeholder='4242 4242 4242 4242' />
                <Input label='Cardholder Name' placeholder='John Doe' />
                <Input label='Expiry Date' placeholder='MM/YY' />
                <Input label='CVC' placeholder='123' type='password' />
              </div>
              <div className='flex justify-end gap-2 mt-4'>
                <Button variant='ghost' onClick={() => setShowAddCard(false)}>Cancel</Button>
                <Button className='bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border-0'>Add Card</Button>
              </div>
            </Card>
          )}

          <Card className='p-4 flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='h-10 w-14 bg-surface rounded-lg flex items-center justify-center'>
                <CreditCard className='w-5 h-5 text-muted' />
              </div>
              <div>
                <p className='text-sm font-medium'>VISA •••• 4242</p>
                <p className='text-xs text-muted'>Expires 12/25</p>
              </div>
            </div>
            <div className='flex items-center gap-2'>
              <Badge variant='secondary' className='bg-emerald-500/20 text-emerald-400 border-0'>Default</Badge>
              <Button variant='ghost' size='icon' className='text-muted hover:text-red-400'><Trash2 className='w-4 h-4' /></Button>
            </div>
          </Card>
        </div>

        <Card className='p-4 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-emerald-500/20'>
          <div className='flex items-center gap-3'>
            <Shield className='w-5 h-5 text-emerald-500' />
            <div>
              <p className='text-sm font-medium'>Secure payments via Stripe</p>
              <p className='text-xs text-muted'>Your payment info is encrypted and never touches our servers</p>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
