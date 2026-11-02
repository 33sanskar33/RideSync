-- Permit the account-deletion service role to clear only SOS actor references.
-- Normal rider-driven acknowledgement/resolution still requires auth.uid() and
-- follows the existing pending -> acknowledged -> resolved transition rules.

CREATE OR REPLACE FUNCTION public.enforce_ride_sos_alert_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  transition_time timestamptz := clock_timestamp();
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS DISTINCT FROM 'pending'
      OR NEW.acknowledged_by IS NOT NULL OR NEW.acknowledged_at IS NOT NULL
      OR NEW.resolved_by IS NOT NULL OR NEW.resolved_at IS NOT NULL THEN
      RAISE check_violation USING MESSAGE = 'New SOS alerts must start pending without acknowledgement or resolution metadata.';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.room_id IS DISTINCT FROM OLD.room_id
    OR NEW.member_id IS DISTINCT FROM OLD.member_id OR NEW.user_id IS DISTINCT FROM OLD.user_id
    OR NEW.rider_name IS DISTINCT FROM OLD.rider_name OR NEW.latitude IS DISTINCT FROM OLD.latitude
    OR NEW.longitude IS DISTINCT FROM OLD.longitude OR NEW.message IS DISTINCT FROM OLD.message
    OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE insufficient_privilege USING MESSAGE = 'SOS alert details cannot be changed after creation.';
  END IF;

  -- The service role may only null actor foreign keys during account deletion.
  -- It cannot change status, timestamps, or assign a different actor.
  IF auth.role() = 'service_role' THEN
    IF NEW.status IS DISTINCT FROM OLD.status
      OR NEW.acknowledged_at IS DISTINCT FROM OLD.acknowledged_at
      OR NEW.resolved_at IS DISTINCT FROM OLD.resolved_at
      OR (NEW.acknowledged_by IS NOT NULL
        AND NEW.acknowledged_by IS DISTINCT FROM OLD.acknowledged_by)
      OR (NEW.resolved_by IS NOT NULL
        AND NEW.resolved_by IS DISTINCT FROM OLD.resolved_by) THEN
      RAISE insufficient_privilege USING MESSAGE = 'Service role may only clear SOS actor references.';
    END IF;
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE insufficient_privilege USING MESSAGE = 'Authentication is required.';
  END IF;

  IF OLD.status = 'pending' AND NEW.status = 'acknowledged' THEN
    NEW.acknowledged_by := auth.uid();
    NEW.acknowledged_at := transition_time;
    NEW.resolved_by := NULL;
    NEW.resolved_at := NULL;
  ELSIF OLD.status IN ('pending', 'acknowledged') AND NEW.status = 'resolved' THEN
    NEW.acknowledged_by := OLD.acknowledged_by;
    NEW.acknowledged_at := OLD.acknowledged_at;
    NEW.resolved_by := auth.uid();
    NEW.resolved_at := transition_time;
  ELSE
    RAISE check_violation USING MESSAGE = format('Invalid SOS status transition: %s -> %s', OLD.status, NEW.status);
  END IF;

  RETURN NEW;
END;
$function$;
