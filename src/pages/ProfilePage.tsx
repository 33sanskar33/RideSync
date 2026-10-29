import { useEffect, useState } from 'react';
import { User, Mail, Phone, Shield } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import DemoNotice from '@/components/DemoNotice';
import Avatar from '@/components/Avatar';
import { supabase } from '@/lib/supabase';

interface AccountProfile {
  fullName: string;
  email: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<AccountProfile>({ fullName: 'Rider', email: '' });

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        console.error('Could not load account profile:', error.message);
        return;
      }
      const user = data.user;
      if (!user) return;
      const fullName =
        typeof user.user_metadata?.full_name === 'string'
          ? user.user_metadata.full_name
          : user.email?.split('@')[0] ?? 'Rider';
      setProfile({ fullName, email: user.email ?? '' });
    });
    return () => { active = false; };
  }, []);

  const initials = profile.fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'R';

  return (
    <DashboardLayout>
      <div className="max-w-2xl">
        <div className="mb-6 flex items-center gap-2">
          <User className="h-5 w-5 text-charcoal-muted" aria-hidden="true" />
          <h1 className="text-xl font-bold tracking-tight text-charcoal sm:text-2xl">Profile</h1>
        </div>
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-card">
          <div className="flex items-center gap-4">
            <Avatar initials={initials} size="lg" />
            <div className="min-w-0">
              <p className="break-words text-base font-semibold text-charcoal">{profile.fullName}</p>
              <p className="break-all text-sm text-charcoal-muted">{profile.email}</p>
            </div>
          </div>
        </div>
        <DemoNotice message="Profile editing is not available yet. Your account information below is read from your signed-in account." />
        <div className="mt-6 space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-card">
            <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-charcoal-muted"><User className="h-3.5 w-3.5" aria-hidden="true" />Full name</label>
            <p className="text-sm text-charcoal-soft">{profile.fullName}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-card">
            <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-charcoal-muted"><Mail className="h-3.5 w-3.5" aria-hidden="true" />Email</label>
            <p className="break-all text-sm text-charcoal-soft">{profile.email}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-card">
            <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-charcoal-muted"><Phone className="h-3.5 w-3.5" aria-hidden="true" />Phone</label>
            <p className="text-sm text-charcoal-soft">Not added</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-card">
            <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-charcoal-muted"><Shield className="h-3.5 w-3.5" aria-hidden="true" />Account status</label>
            <p className="text-sm text-green-700">Signed in</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
