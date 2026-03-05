-- ===== CREATION DES TABLES =====

-- 1. Table Profiles (Profils utilisateurs)
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    first_name text,
    last_name text,
    max_distance integer DEFAULT 25,
    preferred_side text DEFAULT 'left',
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 2. Table Favorites (Favoris)
CREATE TABLE IF NOT EXISTS public.favorites (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    club_name text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, club_name)
);

-- ===== ACTIVATION DU RLS (Row Level Security) =====
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- ===== POLITIQUES RLS =====
-- Pour Profiles: un utilisateur ne peut voir et modifier que son propre profil
CREATE POLICY "Users can view own profile" 
    ON public.profiles FOR SELECT 
    USING ( auth.uid() = id );

CREATE POLICY "Users can insert own profile" 
    ON public.profiles FOR INSERT 
    WITH CHECK ( auth.uid() = id );

CREATE POLICY "Users can update own profile" 
    ON public.profiles FOR UPDATE 
    USING ( auth.uid() = id );

-- Pour Favorites: un utilisateur ne peut voir, ajouter et supprimer que ses propres favoris
CREATE POLICY "Users can view own favorites" 
    ON public.favorites FOR SELECT 
    USING ( auth.uid() = user_id );

CREATE POLICY "Users can insert own favorites" 
    ON public.favorites FOR INSERT 
    WITH CHECK ( auth.uid() = user_id );

CREATE POLICY "Users can delete own favorites" 
    ON public.favorites FOR DELETE 
    USING ( auth.uid() = user_id );

-- ===== TRIGGER POUR CRÉER LE PROFIL AUTOMATIQUEMENT =====
-- (Optionnel mais recommandé : cela crée une ligne dans "profiles" dès qu'un utilisateur s'inscrit)
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- S'assure que le trigger n'existe pas en double
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
