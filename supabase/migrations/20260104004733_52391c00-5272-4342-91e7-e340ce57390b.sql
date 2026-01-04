-- Ensure one row per user for stats and streaks (required for upsert/update logic)

-- 1) De-duplicate user_stats (keep most recently updated row per user)
WITH ranked AS (
  SELECT
    id,
    user_id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id
      ORDER BY updated_at DESC, created_at DESC
    ) AS rn
  FROM public.user_stats
)
DELETE FROM public.user_stats us
USING ranked r
WHERE us.id = r.id
  AND r.rn > 1;

-- 2) De-duplicate user_streaks (keep most recently updated row per user)
WITH ranked AS (
  SELECT
    id,
    user_id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id
      ORDER BY updated_at DESC, created_at DESC
    ) AS rn
  FROM public.user_streaks
)
DELETE FROM public.user_streaks s
USING ranked r
WHERE s.id = r.id
  AND r.rn > 1;

-- 3) Add uniqueness so upsert/update-by-user works reliably
ALTER TABLE public.user_stats
  ADD CONSTRAINT user_stats_user_id_unique UNIQUE (user_id);

ALTER TABLE public.user_streaks
  ADD CONSTRAINT user_streaks_user_id_unique UNIQUE (user_id);
