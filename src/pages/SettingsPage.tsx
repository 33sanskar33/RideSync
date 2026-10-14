import { Settings, Bell, MapPin, Moon, Globe } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import DemoNotice from '@/components/DemoNotice';

const settingItems = [
  {
    icon: Bell,
    title: 'Notifications',
    description: 'Ride invites, departure reminders, and group updates.',
  },
  {
    icon: MapPin,
    title: 'Location sharing',
    description: 'Control when your GPS position is shared with the group.',
  },
  {
    icon: Moon,
    title: 'Appearance',
    description: 'Switch between light and dark themes.',
  },
  {
    icon: Globe,
    title: 'Language & region',
    description: 'Set your preferred language and distance units.',
  },
];

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <div className="max-w-2xl">
        <div className="mb-6 flex items-center gap-2">
          <Settings className="h-5 w-5 text-charcoal-muted" aria-hidden="true" />
          <h1 className="text-xl font-bold tracking-tight text-charcoal sm:text-2xl">
            Settings
          </h1>
        </div>

        <DemoNotice message="Settings and preferences will be implemented in a later stage. The options below show what will be available — changes cannot be saved yet." />

        <div className="mt-6 space-y-3">
          {settingItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="flex items-start gap-3.5 rounded-xl border border-gray-200 bg-white p-5 shadow-card"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-charcoal-muted">
                  <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                </span>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-charcoal">
                    {item.title}
                  </h3>
                  <p className="mt-0.5 text-xs leading-relaxed text-charcoal-muted">
                    {item.description}
                  </p>
                </div>
                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-charcoal-muted">
                  Soon
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
