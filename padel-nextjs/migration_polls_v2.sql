-- Migration pour le support du vote binaire
ALTER TABLE public.poll_votes 
ADD COLUMN IF NOT EXISTS vote_value boolean DEFAULT true; -- Par défaut "Je suis chaud"

-- Si on veut rendre poll_slots autonome (pour l'affichage offline ou sans scraping)
-- ALTER TABLE public.poll_slots ADD COLUMN IF NOT EXISTS club_name text;
