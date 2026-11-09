-- ====================================================================
-- THE LAST WISH / 最後的願望
-- PostgreSQL / Supabase Schema, Indexes, RLS Policies & 7-Day RPC
-- ====================================================================

-- 1. Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create Wishes table
CREATE TABLE IF NOT EXISTS public.wishes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visitor_id TEXT NOT NULL,
    visitor_hash TEXT NOT NULL,
    text VARCHAR(300) NOT NULL,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    pos_x FLOAT NOT NULL,
    pos_y FLOAT NOT NULL,
    pos_z FLOAT NOT NULL,
    brightness FLOAT NOT NULL DEFAULT 1.0,
    size FLOAT NOT NULL DEFAULT 1.0
);

-- 3. Indexes for fast lookup and 7-day restriction checks
CREATE INDEX IF NOT EXISTS idx_wishes_visitor_id ON public.wishes(visitor_id);
CREATE INDEX IF NOT EXISTS idx_wishes_visitor_hash ON public.wishes(visitor_hash);
CREATE INDEX IF NOT EXISTS idx_wishes_created_at ON public.wishes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wishes_public ON public.wishes(is_public) WHERE is_public = TRUE;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.wishes ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policy: Anyone can read public wishes or stars' celestial positions
-- Private wish text is NOT exposed to unauthorized visitors
CREATE OR REPLACE VIEW public.constellation_stars AS
SELECT 
    id,
    pos_x,
    pos_y,
    pos_z,
    brightness,
    size,
    is_public,
    created_at,
    CASE 
        WHEN is_public = TRUE THEN text
        ELSE NULL
    END AS text
FROM public.wishes;

-- 6. Atomic Server-Side Function (RPC) enforcing the strict 7-Day Rule:
-- Prevents duplicate submissions and race conditions at the database transaction level
CREATE OR REPLACE FUNCTION submit_wish_with_7day_rule(
    p_visitor_id TEXT,
    p_visitor_hash TEXT,
    p_text TEXT,
    p_is_public BOOLEAN,
    p_pos_x FLOAT,
    p_pos_y FLOAT,
    p_pos_z FLOAT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_last_created_at TIMESTAMPTZ;
    v_new_wish RECORD;
    v_elapsed INTERVAL;
    v_remaining_seconds INT;
BEGIN
    -- Check text length
    IF length(trim(p_text)) = 0 OR length(trim(p_text)) > 300 THEN
        RAISE EXCEPTION 'Wish content must be between 1 and 300 characters.';
    END IF;

    -- Count submissions in the rolling 7-day window for this visitor identifier or fingerprint hash
    DECLARE
        v_recent_count INT;
        v_oldest_created_at TIMESTAMPTZ;
    BEGIN
        SELECT COUNT(*), MIN(created_at)
        INTO v_recent_count, v_oldest_created_at
        FROM public.wishes
        WHERE (visitor_id = p_visitor_id OR visitor_hash = p_visitor_hash)
          AND created_at >= (now() - INTERVAL '7 days');

        IF v_recent_count >= 3 THEN
            v_elapsed := now() - v_oldest_created_at;
            v_remaining_seconds := EXTRACT(EPOCH FROM (INTERVAL '7 days' - v_elapsed))::INT;
            RAISE EXCEPTION 'COOLDOWN_ACTIVE:%', v_remaining_seconds;
        END IF;
    END;

    -- Insert new wish with authoritative database timestamp
    INSERT INTO public.wishes (
        visitor_id,
        visitor_hash,
        text,
        is_public,
        created_at,
        pos_x,
        pos_y,
        pos_z,
        brightness,
        size
    ) VALUES (
        p_visitor_id,
        p_visitor_hash,
        trim(p_text),
        p_is_public,
        now(),
        p_pos_x,
        p_pos_y,
        p_pos_z,
        1.0 + (random() * 0.3),
        1.0 + (random() * 0.4)
    )
    RETURNING id, text, is_public, created_at, pos_x, pos_y, pos_z, brightness, size INTO v_new_wish;

    RETURN jsonb_build_object(
        'success', true,
        'id', v_new_wish.id,
        'created_at', v_new_wish.created_at,
        'is_public', v_new_wish.is_public,
        'pos', jsonb_build_array(v_new_wish.pos_x, v_new_wish.pos_y, v_new_wish.pos_z)
    );
END;
$$;
