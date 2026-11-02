-- Add indexes for foreign-key columns used during account deletion and rider cleanup.
-- These indexes keep ON DELETE CASCADE / SET NULL checks efficient as ride data grows.

CREATE INDEX IF NOT EXISTS ride_locations_member_id_idx
  ON public.ride_locations (member_id);

CREATE INDEX IF NOT EXISTS ride_locations_user_id_idx
  ON public.ride_locations (user_id);

CREATE INDEX IF NOT EXISTS ride_members_user_id_idx
  ON public.ride_members (user_id);

CREATE INDEX IF NOT EXISTS ride_sos_alerts_acknowledged_by_idx
  ON public.ride_sos_alerts (acknowledged_by);

CREATE INDEX IF NOT EXISTS ride_sos_alerts_member_id_idx
  ON public.ride_sos_alerts (member_id);

CREATE INDEX IF NOT EXISTS ride_sos_alerts_resolved_by_idx
  ON public.ride_sos_alerts (resolved_by);

CREATE INDEX IF NOT EXISTS ride_sos_alerts_user_id_idx
  ON public.ride_sos_alerts (user_id);
