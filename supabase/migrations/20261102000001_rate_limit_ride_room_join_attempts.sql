-- Reduce room-code guessing risk for authenticated users.
-- A user may make at most 10 failed room-code attempts in a rolling 15-minute window.

CREATE TABLE IF NOT EXISTS private.ride_room_join_attempts (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  window_started_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  failed_attempts integer NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0)
);

ALTER TABLE private.ride_room_join_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE private.ride_room_join_attempts
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.join_ride_room_by_code_impl(
  requested_room_code text,
  requested_rider_name text
)
RETURNS TABLE (joined_room_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'auth'
AS $function$
DECLARE
  v_user_id uuid;
  v_room_id uuid;
  v_member_id uuid;
  v_existing_user_id uuid;
  v_room_code text;
  v_rider_name text;
  v_failed_attempts integer;
  v_window_started_at timestamptz;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  v_room_code := upper(btrim(coalesce(requested_room_code, '')));
  v_rider_name := btrim(coalesce(requested_rider_name, ''));

  IF length(v_room_code) < 4 OR length(v_room_code) > 32 THEN
    RAISE EXCEPTION 'Invalid room code';
  END IF;

  IF length(v_rider_name) < 1 OR length(v_rider_name) > 40 THEN
    RAISE EXCEPTION 'Rider name must be between 1 and 40 characters';
  END IF;

  -- Serialize attempts for this account so parallel requests cannot bypass the limit.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  SELECT attempts.failed_attempts, attempts.window_started_at
    INTO v_failed_attempts, v_window_started_at
  FROM private.ride_room_join_attempts AS attempts
  WHERE attempts.user_id = v_user_id
  FOR UPDATE;

  IF FOUND
    AND v_window_started_at > clock_timestamp() - interval '15 minutes'
    AND v_failed_attempts >= 10 THEN
    RAISE EXCEPTION 'Too many incorrect room codes. Please wait 15 minutes before trying again.'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT r.id
    INTO v_room_id
  FROM public.ride_rooms AS r
  WHERE upper(r.room_code) = v_room_code
    AND r.status IS DISTINCT FROM 'ended'
  LIMIT 1;

  IF v_room_id IS NULL THEN
    INSERT INTO private.ride_room_join_attempts (user_id, window_started_at, failed_attempts)
    VALUES (v_user_id, clock_timestamp(), 1)
    ON CONFLICT (user_id) DO UPDATE
    SET
      window_started_at = CASE
        WHEN private.ride_room_join_attempts.window_started_at <= clock_timestamp() - interval '15 minutes'
          THEN clock_timestamp()
        ELSE private.ride_room_join_attempts.window_started_at
      END,
      failed_attempts = CASE
        WHEN private.ride_room_join_attempts.window_started_at <= clock_timestamp() - interval '15 minutes'
          THEN 1
        ELSE private.ride_room_join_attempts.failed_attempts + 1
      END;
    RETURN;
  END IF;

  -- Rejoining with the same account and same rider name is idempotent.
  SELECT m.id
    INTO v_member_id
  FROM public.ride_members AS m
  WHERE m.room_id = v_room_id
    AND m.user_id = v_user_id
    AND m.rider_name = v_rider_name
  LIMIT 1;

  IF v_member_id IS NOT NULL THEN
    DELETE FROM private.ride_room_join_attempts WHERE user_id = v_user_id;
    RETURN QUERY SELECT v_room_id;
    RETURN;
  END IF;

  -- Rider names are unique within a room. A legacy unclaimed row can be
  -- adopted by the authenticated user who joins with that same name.
  SELECT m.id, m.user_id
    INTO v_member_id, v_existing_user_id
  FROM public.ride_members AS m
  WHERE m.room_id = v_room_id
    AND m.rider_name = v_rider_name
  LIMIT 1;

  IF v_member_id IS NOT NULL THEN
    IF v_existing_user_id IS NULL THEN
      UPDATE public.ride_members
         SET user_id = v_user_id
       WHERE id = v_member_id;

      UPDATE public.ride_locations
         SET user_id = v_user_id,
             member_id = v_member_id
       WHERE room_id = v_room_id
         AND rider_name = v_rider_name
         AND user_id IS NULL;
    ELSIF v_existing_user_id <> v_user_id THEN
      RAISE EXCEPTION 'That rider name is already used in this room. Choose another name.';
    END IF;
  ELSE
    INSERT INTO public.ride_members (room_id, user_id, rider_name)
    VALUES (v_room_id, v_user_id, v_rider_name)
    RETURNING id INTO v_member_id;
  END IF;

  DELETE FROM private.ride_room_join_attempts WHERE user_id = v_user_id;
  RETURN QUERY SELECT v_room_id;
END;
$function$;
