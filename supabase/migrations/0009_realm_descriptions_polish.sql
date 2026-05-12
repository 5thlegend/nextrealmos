-- =====================================================================
--  V3.4 — realm description polish + UTF-8 mojibake fix
--  P1-8: nro-operator-core description had `�` (replacement char)
--        from a botched encoding pipeline. Restore the em-dash.
--  P1-2: tighten descriptions for the elite realm slate so /civilization
--        cards read sharply.
-- =====================================================================

update realms set description =
  'NRO · Operator Core. The public face of every operator: dossier, signal map, deployment log. The first realm to render the federation outward.'
 where slug ilike 'nro-operator-core' or slug ilike 'nextrealmoperators';

-- LEGVCY is an elite leader's realm — let's give it a proper one-liner
update realms set description =
  'LEGVCY · The Way. Tiered subscription doctrine for sovereign operators. Initiate / Adept / Master / Sovereign Keys. Run as a sovereign elite realm.'
 where slug ilike 'legvcy' and (description is null or description = '' or description ilike '%TODO%');

-- DivinWine
update realms set description =
  'DivinWine. Sage-curated wine intelligence reserve. Sovereign elite realm under the Sage of the Cellar.'
 where slug ilike 'divinwine' and (description is null or description = '' or description ilike '%TODO%');

-- LASTMILE OS
update realms set description =
  'LASTMILE OS. Cannabis last-mile delivery operating system. Driver PWA + admin console + Twilio SMS. Sovereign elite realm.'
 where slug ilike 'lastmile-os' and (description is null or description = '' or description ilike '%TODO%');

-- WeightRoomApp
update realms set description =
  'WeightRoomApp. High-school strength program SaaS. Branded per school. Coach console + athlete short-code access.'
 where slug ilike 'weightroom-app' and (description is null or description = '' or description ilike '%TODO%');

-- Money Factory (the realm node that lists the armory entries)
update realms set description =
  'The Money Factory. Restricted-armory of high-leverage, deployable apps. Each entry rank-gated. Visible only to qualifying operators.'
 where slug ilike 'money-factory' and (description is null or description = '' or description ilike '%TODO%');

-- OverNight Money Apps
update realms set description =
  'OverNight Money Apps. Rapid-ship micro-SaaS factory. Each app published as nr-[name].pages.dev with shared core + NRO export adapter.'
 where slug ilike 'overnight-money-apps' and (description is null or description = '' or description ilike '%TODO%');

-- ARCSEED
update realms set description =
  'ARCSEED. Worldcraft + simulation division. Games, immersive worlds, simulations. Future VR Nexus integration.'
 where slug ilike 'arcseed' and (description is null or description = '' or description ilike '%TODO%');

-- Tag base_url for OG since we know it
update realms set base_url = 'https://nextrealm-operators.dankpenta.workers.dev'
 where (slug ilike 'nro-operator-core' or slug ilike 'nextrealmoperators') and base_url is null;

notify pgrst, 'reload schema';
