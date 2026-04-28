-- Alexandria — private-beta invite-code gate.
--
-- Creates the `invite_codes` table and two RPCs consumed by SignUp.tsx:
--   * `invite_code_available(code_text)` — anon-safe pre-check.
--   * `redeem_invite(code_text)` — authenticated, atomic single-use redemption.
--
-- RLS on the table locks direct access; all interaction flows through the
-- SECURITY DEFINER RPCs so the anon role can validate without reading the
-- whole list.

-- =============================================================================
-- Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.invite_codes (
  code text PRIMARY KEY,
  redeemed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  redeemed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  note text
);

ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

-- No client-side policies. All reads/writes happen through SECURITY DEFINER
-- RPC functions below. The table is effectively inaccessible to anon and
-- authenticated roles unless they go through those RPCs.

-- =============================================================================
-- invite_code_available(code_text text) -> boolean
-- =============================================================================
-- Returns true if the code exists AND has not been redeemed. Safe to call
-- without auth (the signup flow calls this before creating a user).
-- Intentionally returns a plain boolean: does NOT reveal whether the code
-- exists but was already used vs. never existed — both paths return false.

CREATE OR REPLACE FUNCTION public.invite_code_available(code_text text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.invite_codes
    WHERE code = upper(trim(code_text))
      AND redeemed_by IS NULL
  );
$$;

GRANT EXECUTE ON FUNCTION public.invite_code_available(text) TO anon, authenticated;

-- =============================================================================
-- redeem_invite(code_text text) -> boolean
-- =============================================================================
-- Atomically marks the code as redeemed by the calling user. Returns true on
-- success, false if the code was missing or already redeemed. Requires an
-- authenticated session (auth.uid() must be non-null) so it's safe to call
-- after supabase.auth.signUp completes.

CREATE OR REPLACE FUNCTION public.redeem_invite(code_text text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_rows integer;
BEGIN
  IF v_user IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.invite_codes
     SET redeemed_by = v_user,
         redeemed_at = now()
   WHERE code = upper(trim(code_text))
     AND redeemed_by IS NULL;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows = 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_invite(text) TO authenticated;

-- =============================================================================
-- Seeding
-- =============================================================================
-- Uncomment and run manually to seed a batch of private-beta codes. Codes
-- are stored upper-case (both RPCs upper() their input before comparing).
--
-- INSERT INTO public.invite_codes (code, note) VALUES
--   ('ALEX-ABCD-0001', 'wave 1'),
--   ('ALEX-ABCD-0002', 'wave 1'),
--   ('ALEX-ABCD-0003', 'wave 1'),
--   ('ALEX-ABCD-0004', 'wave 1'),
--   ('ALEX-ABCD-0005', 'wave 1'),
--   ('ALEX-ABCD-0006', 'wave 1'),
--   ('ALEX-ABCD-0007', 'wave 1'),
--   ('ALEX-ABCD-0008', 'wave 1'),
--   ('ALEX-ABCD-0009', 'wave 1'),
--   ('ALEX-ABCD-0010', 'wave 1')
-- ON CONFLICT (code) DO NOTHING;

-- =============================================================================
-- Verification
-- =============================================================================
-- As anon (no session):
--   SELECT public.invite_code_available('ALEX-ABCD-0001');
--   -> expected: true (if seeded) or false.
--
-- As an authenticated user:
--   SELECT public.redeem_invite('ALEX-ABCD-0001');
--   -> expected: true first call, false on re-run.
