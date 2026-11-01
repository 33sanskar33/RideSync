-- Record one background push-dispatch attempt per SOS alert.
-- Only the server-side service_role may access this table; clients cannot read or modify it.

CREATE TABLE IF NOT EXISTS public.ride_sos_push_dispatches (
  alert_id uuid PRIMARY KEY
    REFERENCES public.ride_sos_alerts(id) ON DELETE CASCADE,
  attempted_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

ALTER TABLE public.ride_sos_push_dispatches ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.ride_sos_push_dispatches
  FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT ON TABLE public.ride_sos_push_dispatches TO service_role;
