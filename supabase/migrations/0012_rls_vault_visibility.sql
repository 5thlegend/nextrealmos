-- =====================================================================
--  V3.7 — RLS: vaulted realms are publicly visible
--  Doctrine: vaulted realms preserve federation memory. They should be
--  visible at /realms/[slug] with a VAULTED badge, not hidden.
--  Previously realms_active_readable filtered status='ACTIVE' only.
-- =====================================================================

drop policy if exists realms_active_readable on realms;
create policy realms_active_readable on realms for select
  using (
    status = 'ACTIVE'
    or vaulted_at is not null
    or owner_operator_id = current_operator_id()
  );

notify pgrst, 'reload schema';
