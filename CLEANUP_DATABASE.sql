-- DATABASE CLEANUP SCRIPT
-- WARNING: This will DELETE most test data!
-- Only keeps: techadmin + 1 investor + 1 property owner

-- Step 1: Identify users to KEEP
-- Replace these IDs with the actual UUIDs from your database

-- Find techadmin (admin user)
-- SELECT id, email, full_name, role FROM profiles WHERE role = 'admin' LIMIT 1;

-- Find one investor to keep
-- SELECT id, email, full_name, role FROM profiles WHERE role = 'inversionista' LIMIT 1;

-- Find one property owner to keep  
-- SELECT id, email, full_name, role FROM profiles WHERE role = 'propietario' LIMIT 1;

-- Step 2: DELETE all other data
-- IMPORTANT: Execute these queries ONE BY ONE and verify results

-- Delete inversiones (investments) not related to kept users
DELETE FROM inversiones
WHERE inversionista_id NOT IN (
  SELECT id FROM profiles 
  WHERE email = 'techadmin@example.com' 
     OR role = 'inversionista' 
  LIMIT 2  -- Adjust based on which investor you want to keep
);

-- Delete plan_pagos (payment plans) for credits not owned by kept users
DELETE FROM plan_pagos
WHERE credito_id IN (
  SELECT id FROM creditos
  WHERE cliente_id NOT IN (
    SELECT id FROM profiles 
    WHERE email = 'techadmin@example.com'
       OR role = 'propietario'
    LIMIT 2  -- Adjust based on which owner you want to keep
  )
);

-- Delete creditos (credits) not owned by kept users
DELETE FROM creditos
WHERE cliente_id NOT IN (
  SELECT id FROM profiles 
  WHERE email = 'techadmin@example.com'
     OR role = 'propietario'
  LIMIT 2
);

-- Delete profiles not in the keep list
DELETE FROM profiles
WHERE id NOT IN (
  -- Keep techadmin
  (SELECT id FROM profiles WHERE email = 'techadmin@example.com' LIMIT 1),
  -- Keep first investor
  (SELECT id FROM profiles WHERE role = 'inversionista' ORDER BY created_at LIMIT 1),
  -- Keep first property owner
  (SELECT id FROM profiles WHERE role = 'propietario' ORDER BY created_at LIMIT 1)
);

-- Step 3: Clean auth.users table (Supabase Authentication)
-- This requires Admin SQL access in Supabase Dashboard

-- List all auth users to identify which to keep
-- SELECT id, email, created_at FROM auth.users ORDER BY created_at;

-- Delete auth users not in profiles
-- DELETE FROM auth.users 
-- WHERE id NOT IN (SELECT id FROM profiles);

-- Step 4: Verify cleanup
SELECT 
  'profiles' as table_name, 
  COUNT(*) as remaining_count,
  string_agg(DISTINCT role, ', ') as roles
FROM profiles

UNION ALL

SELECT 
  'creditos' as table_name,
  COUNT(*) as remaining_count,
  NULL as roles
FROM creditos

UNION ALL

SELECT 
  'inversiones' as table_name,
  COUNT(*) as remaining_count,
  NULL as roles
FROM inversiones

UNION ALL

SELECT 
  'plan_pagos' as table_name,
  COUNT(*) as remaining_count,
  NULL as roles
FROM plan_pagos;

-- Expected result:
-- profiles: 3 rows (admin, inversionista, propietario)
-- creditos: 0-3 rows (depending on test data)
-- inversiones: 0-3 rows
-- plan_pagos: 0-N rows (depends on creditos)
