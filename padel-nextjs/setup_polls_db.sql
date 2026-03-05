-- ===== CREATION DES TABLES DU SYSTEME DE SONDAGE =====

-- 1. Table Polls (Sondages)
CREATE TABLE IF NOT EXISTS public.polls (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 2. Table Poll Slots (Les créneaux présélectionnés dans un sondage)
CREATE TABLE IF NOT EXISTS public.poll_slots (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    poll_id uuid REFERENCES public.polls ON DELETE CASCADE NOT NULL,
    slot_id uuid NOT NULL, -- Identifiant du créneau
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    UNIQUE(poll_id, slot_id)
);

-- 3. Table Poll Votes (Les votes des joueurs sur les créneaux d'un sondage)
CREATE TABLE IF NOT EXISTS public.poll_votes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    poll_id uuid REFERENCES public.polls ON DELETE CASCADE NOT NULL,
    slot_id uuid NOT NULL, 
    user_name text NOT NULL, -- Le nom tapé par le joueur (connexion non requise)
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    UNIQUE(poll_id, slot_id, user_name)
);

-- ===== ACTIVATION DU RLS (Row Level Security) =====
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

-- ===== POLITIQUES RLS =====

-- POLLS
-- Tout le monde peut voir un sondage
CREATE POLICY "Anyone can view polls" 
    ON public.polls FOR SELECT 
    USING ( true );

-- Seul le créateur peut insérer son sondage
CREATE POLICY "Users can create polls" 
    ON public.polls FOR INSERT 
    WITH CHECK ( auth.uid() = user_id );

CREATE POLICY "Users can update own polls" 
    ON public.polls FOR UPDATE 
    USING ( auth.uid() = user_id );

CREATE POLICY "Users can delete own polls" 
    ON public.polls FOR DELETE 
    USING ( auth.uid() = user_id );


-- POLL SLOTS
-- Tout le monde peut voir les créneaux d'un sondage
CREATE POLICY "Anyone can view poll slots" 
    ON public.poll_slots FOR SELECT 
    USING ( true );

-- On permet l'insertion de slots via les serveurs d'action (Rôle admin)
-- ou si on est authentifié (via le client direct, l'insertion se fera via les server actions)
CREATE POLICY "Users can insert poll slots" 
    ON public.poll_slots FOR INSERT 
    WITH CHECK ( auth.uid() IS NOT NULL );


-- POLL VOTES (VOTES ANONYMES AUTORISÉS)
-- Tout le monde peut voir les votes
CREATE POLICY "Anyone can view poll votes" 
    ON public.poll_votes FOR SELECT 
    USING ( true );

-- N'importe qui peut voter (c'est l'objectif du lien magique partagé avec des potes non-inscrits)
CREATE POLICY "Anyone can insert a vote" 
    ON public.poll_votes FOR INSERT 
    WITH CHECK ( true );

-- N'importe qui peut annuler son propre vote (le client filtre par slot et par nom pour autoriser)
CREATE POLICY "Anyone can delete a vote" 
    ON public.poll_votes FOR DELETE 
    USING ( true );
