import { User, Mail, Phone, Shield } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import DemoNotice from '@/components/DemoNotice';
import Avatar from '@/components/Avatar';

export default function ProfilePage() {
  return (
    <DashboardLayout>
      <div className="max-w-2xl">
        <div className="mb-6 flex items-center gap-2">
          <User className="h-5 w-5 text-charcoal-muted" aria-hidden="true" />
          <h1 className="text-xl font-bold tracking-tight text-charcoal sm:text-2xl">
            Profile
          </h1>
        </div>

        {/* Profile header card */}
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-card">
          <div className="flex items-center gap-4">
            <Avatar initials="RD" size="lg" />
            <div>
              <p className="text-base font-semibold text-charcoal">Demo Rider</p>
              <p className="text-sm text-charcoal-muted">Demo account — not signed in</p>
            </div>
          </div>
        </div>

        <DemoNotice message="Profile editing will be implemented in a later stage. The fields below show what will be available — changes cannot be saved yet." />

        {/* Read-only profile fields */}
        <div className="mt-6 space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-card">
            <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-charcoal-muted">
              <User className="h-3.5 w-3.5" aria-hidden="true" />
              Full name
            </label>
            <p className="text-sm text-charcoal-soft">Not set</p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-card">
            <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-charcoal-muted">
              <Mail className="h-3.5 w-3.5" aria-hidden="true" />
              Email
            </label>
            <p className="text-sm text-charcoal-soft">Not set</p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-card">
            <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-charcoal-muted">
              <Phone className="h-3.5 w-3.5" aria-hidden="true" />
              Phone
            </label>
            <p className="text-sm text-charcoal-soft">Not set</p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-card">
            <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-charcoal-muted">
              <Shield className="h-3.5 w-3.5" aria-hidden="true" />
              Account status
            </label>
            <p className="text-sm text-charcoal-soft">Demo — no account connected</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
