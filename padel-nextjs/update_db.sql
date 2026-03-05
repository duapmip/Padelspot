-- MISE À JOUR : On modifie le type de slot_id car les identifiants de créneaux sont du texte (ex: "club-date-heure") et non des UUIDs.

-- On supprime les anciennes vues si elles bloquent
DROP VIEW IF EXISTS public.poll_slots_view;

-- Modification des tables de sondage pour accepter du texte en slot_id
ALTER TABLE public.poll_slots ALTER COLUMN slot_id TYPE text USING slot_id::text;
ALTER TABLE public.poll_votes ALTER COLUMN slot_id TYPE text USING slot_id::text;
