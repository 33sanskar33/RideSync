import { useState } from 'react';
import {
  CalendarPlus,
  KeyRound,
  MapPin,
  Compass,
  Navigation,
  CalendarDays,
  ArrowRight,
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import Button from '@/components/Button';
import CreateRideModal from '@/components/CreateRideModal';
import JoinRideModal from '@/components/JoinRideModal';

const howItWorks = [
  {
    step: 1,
    title: 'Create or join',
    description: 'Start a ride or enter a room code from your group.',
    icon: KeyRound,
  },
  {
    step: 2,
    title: 'Choose a destination',
    description: 'Pick where your group is heading together.',
    icon: MapPin,
  },
  {
    step: 3,
    title: 'Follow the shared map',
    description: 'See your group on the road in real time.',
    icon: Navigation,
  },
];

export default function DashboardPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  return (
    <DashboardLayout>
      {/* Demo banner */}
      <div className="mb-6 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5">
        <span className="inline-flex h-2 w-2 shrink-0 rounded-full bg-amber-400" aria-hidden="true" />
        <p className="text-xs font-medium text-amber-800">
          Demo mode — authentication is not connected yet. This dashboard is for preview only.
        </p>
      </div>

      {/* Welcome section */}
      <section className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">
          Ready for your next ride?
        </h1>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-charcoal-muted sm:text-base">
          Create a group ride and invite your friends, or join an existing ride
          with a room code. Let&apos;s ride together.
        </p>
      </section>

      {/* Action cards */}
      <section
        className="mb-10 grid gap-4 sm:grid-cols-2"
        aria-label="Ride actions"
      >
        {/* Create a Ride */}
        <div className="group flex flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-card transition-shadow hover:shadow-card-hover">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-ridesync-50 text-ridesync-600">
            <CalendarPlus className="h-6 w-6" aria-hidden="true" />
          </div>
          <h2 className="text-lg font-semibold text-charcoal">Create a Ride</h2>
          <p className="mt-1.5 flex-1 text-sm leading-relaxed text-charcoal-muted">
            Set up a new group ride, choose a destination, and invite friends
            with a shareable room code.
          </p>
          <Button
            onClick={() => setCreateOpen(true)}
            size="md"
            className="mt-4 self-start"
          >
            Create a Ride
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        {/* Join a Ride */}
        <div className="group flex flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-card transition-shadow hover:shadow-card-hover">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-ridesync-50 text-ridesync-600">
            <KeyRound className="h-6 w-6" aria-hidden="true" />
          </div>
          <h2 className="text-lg font-semibold text-charcoal">Join a Ride</h2>
          <p className="mt-1.5 flex-1 text-sm leading-relaxed text-charcoal-muted">
            Have a room code from a friend? Enter it to join their group ride
            and see the route.
          </p>
          <Button
            onClick={() => setJoinOpen(true)}
            variant="secondary"
            size="md"
            className="mt-4 self-start"
          >
            Join a Ride
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </section>

      {/* Recent rides */}
      <section className="mb-10" aria-label="Recent rides">
        <div className="mb-4 flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-charcoal-muted" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-charcoal">Recent Rides</h2>
        </div>
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
            <Compass className="h-7 w-7 text-gray-400" aria-hidden="true" />
          </div>
          <p className="text-sm font-medium text-charcoal-soft">
            Your rides will appear here once you start riding with your group.
          </p>
          <p className="mt-1 text-xs text-charcoal-muted">
            Create a ride or join one to get started.
          </p>
          <Button
            onClick={() => setCreateOpen(true)}
            variant="secondary"
            size="sm"
            className="mt-5"
          >
            Create a Ride
          </Button>
        </div>
      </section>

      {/* How RideSync works */}
      <section aria-label="How RideSync works">
        <div className="mb-4 flex items-center gap-2">
          <h2 className="text-lg font-semibold text-charcoal">How RideSync works</h2>
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-charcoal-muted">
            Preview
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {howItWorks.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-card"
              >
                <div className="mb-3 flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ridesync-50 text-ridesync-600">
                    <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                  </span>
                  <span className="text-xs font-bold text-gray-400">
                    Step {item.step}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-charcoal">
                  {item.title}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-charcoal-muted">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-charcoal-muted">
          This is a preview of the planned workflow — these features are not yet operational.
        </p>
      </section>

      {/* Modals */}
      <CreateRideModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <JoinRideModal open={joinOpen} onClose={() => setJoinOpen(false)} />
    </DashboardLayout>
  );
}
