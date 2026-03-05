-- ===== MIGRATION : AMIS ET NOTIFICATIONS DE SONDAGE =====

-- 1. Ajout des colonnes de notification dans la table Polls
ALTER TABLE public.polls 
ADD COLUMN IF NOT EXISTS target_voters_count integer DEFAULT 4,
ADD COLUMN IF NOT EXISTS notified boolean DEFAULT false;

-- 2. Création de la table 'friends' (Mes Potes)
CREATE TABLE IF NOT EXISTS public.friends (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    friend_name text NOT NULL,
    friend_id uuid REFERENCES auth.users ON DELETE SET NULL, -- Si le pote a un compte PadelSpot
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, friend_name)
);

-- ===== RLS POUR LES AMIS =====
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own friends" 
    ON public.friends FOR SELECT 
    USING ( auth.uid() = user_id );

CREATE POLICY "Users can insert own friends" 
    ON public.friends FOR INSERT 
    WITH CHECK ( auth.uid() = user_id );

CREATE POLICY "Users can delete own friends" 
    ON public.friends FOR DELETE 
    USING ( auth.uid() = user_id );

-- ===== FONCTION POUR VÉRIFIER SI LE SONDAGE EST COMPLET =====
-- Cette fonction compte les votants uniques et peut être appelée pour savoir si on doit notifier
CREATE OR REPLACE FUNCTION public.get_poll_voter_count(p_id uuid)
RETURNS integer AS $$
BEGIN
  RETURN (SELECT count(DISTINCT user_name) FROM public.poll_votes WHERE poll_id = p_id);
END;
$$ LANGUAGE plpgsql;
