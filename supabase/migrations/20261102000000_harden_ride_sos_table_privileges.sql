-- Restrict SOS table API privileges to the exact operations used by RideSync.
-- RLS remains responsible for deciding which ride rows a signed-in user may access.
-- Column-level grants prevent clients from setting server-managed SOS lifecycle metadata.

REVOKE ALL PRIVILEGES ON TABLE public.ride_sos_alerts
  FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.ride_sos_alerts TO authenticated;

GRANT INSERT (
  room_id,
  member_id,
  user_id,
  rider_name,
  latitude,
  longitude,
  message
) ON TABLE public.ride_sos_alerts TO authenticated;

GRANT UPDATE (status)
  ON TABLE public.ride_sos_alerts TO authenticated;
