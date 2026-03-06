-- ===== MIGRATION : RESERVATIONS ET JOUEURS =====

-- 1. Table des réservations confirmées
CREATE TABLE IF NOT EXISTS public.reservations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    slot_id text, -- Change to text to accept all types of IDs (UUID or strings)
    center_name text NOT NULL,
    court_name text,
    start_time timestamp with time zone NOT NULL,
    duration_minutes integer,
    price numeric,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Assurons-nous que slot_id est bien du texte (au cas où la table existait déjà en UUID)
DO $$ 
BEGIN 
    ALTER TABLE public.reservations ALTER COLUMN slot_id TYPE text;
EXCEPTION 
    WHEN others THEN NULL; 
END $$;

-- 2. Table pour les joueurs additionnels
CREATE TABLE IF NOT EXISTS public.reservation_players (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    reservation_id uuid REFERENCES public.reservations ON DELETE CASCADE NOT NULL,
    player_name text NOT NULL,
    friend_id uuid REFERENCES public.friends ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    UNIQUE(reservation_id, player_name)
);

-- 3. Activation RLS
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_players ENABLE ROW LEVEL SECURITY;

-- 4. Politiques RLS (avec DROP IF EXISTS pour éviter les erreurs)
DROP POLICY IF EXISTS "Users can view own reservations" ON public.reservations;
CREATE POLICY "Users can view own reservations" 
    ON public.reservations FOR SELECT 
    USING ( auth.uid() = user_id );

DROP POLICY IF EXISTS "Users can insert own reservations" ON public.reservations;
CREATE POLICY "Users can insert own reservations" 
    ON public.reservations FOR INSERT 
    WITH CHECK ( auth.uid() = user_id );

DROP POLICY IF EXISTS "Users can view reservation players" ON public.reservation_players;
CREATE POLICY "Users can view reservation players" 
    ON public.reservation_players FOR SELECT 
    USING ( EXISTS (
        SELECT 1 FROM public.reservations 
        WHERE id = reservation_players.reservation_id AND user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Users can insert reservation players" ON public.reservation_players;
CREATE POLICY "Users can insert reservation players" 
    ON public.reservation_players FOR INSERT 
    WITH CHECK ( EXISTS (
        SELECT 1 FROM public.reservations 
        WHERE id = reservation_players.reservation_id AND user_id = auth.uid()
    ));

-- 5. Ajout is_validated aux polls
DO $$ 
BEGIN 
    ALTER TABLE public.polls ADD COLUMN IF NOT EXISTS is_validated boolean DEFAULT false;
EXCEPTION 
    WHEN others THEN NULL; 
END $$;
