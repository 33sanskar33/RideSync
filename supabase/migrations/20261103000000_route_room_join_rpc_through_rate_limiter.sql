-- Route the public join RPC through the authenticated, rate-limited implementation.
-- The frontend calls public.join_ride_room_by_code; without this wrapper the
-- private rate limiter is never reached.

REVOKE ALL ON FUNCTION private.join_ride_room_by_code_impl(text, text)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.join_ride_room_by_code(
  requested_room_code text,
  requested_rider_name text
)
RETURNS TABLE (joined_room_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $function$
BEGIN
  RETURN QUERY
  SELECT result.joined_room_id
  FROM private.join_ride_room_by_code_impl(
    requested_room_code,
    requested_rider_name
  ) AS result;
END;
$function$;

REVOKE ALL ON FUNCTION public.join_ride_room_by_code(text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_ride_room_by_code(text, text)
  TO authenticated;
