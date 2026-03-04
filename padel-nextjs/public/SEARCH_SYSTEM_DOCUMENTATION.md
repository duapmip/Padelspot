# Documentation du Système de Recherche de Créneaux

Ce document décrit l'architecture et la logique du système de recherche et de filtrage mis en place pour l'application "Slot Compass". Ce système est conçu pour gérer deux cas d'usage principaux : la recherche précise (date/heure spécifiques) et la recherche flexible (comparaison sur plusieurs jours/plages horaires).

## 1. Modèle de Données

Le système repose sur deux entités principales : `Slot` (Créneau) et `ClubOffer` (Offre Club).

### Structure

```typescript
// Une offre spécifique d'un club pour un créneau donné
export interface ClubOffer {
  id: string;
  clubName: string;
  location: string;
  price: number;
  surface: 'Terre Battue' | 'Dur' | 'Gazon' | 'Moquette';
  coordinates: {
    lat: number;
    lng: number;
  };
  isFavorite: boolean;
}

// Un créneau temporel qui regroupe toutes les offres disponibles pour cet horaire
export interface Slot {
  id: string;
  start: Date; // Heure de début
  end: Date;   // Heure de fin (calculée dynamiquement selon la durée choisie)
  offers: ClubOffer[]; // Liste des offres pour ce créneau
}
```

**Concept Clé :** Un `Slot` est un conteneur temporel. Il existe indépendamment du club. Si 3 clubs sont libres le Lundi à 18h, il y aura **un seul** objet `Slot` (Lundi 18h) contenant **trois** objets `ClubOffer`.

## 2. État des Filtres (FilterState)

L'état de la recherche est géré par une interface unique qui supporte les deux modes.

```typescript
export type SearchMode = 'specific' | 'flexible';

export interface FilterState {
  mode: SearchMode;       // 'specific' ou 'flexible'
  duration: number;       // Durée en minutes (ex: 90)
  
  // --- Filtres Communs ---
  location: string | null; // Ville (ex: "Bordeaux")
  favoritesOnly: boolean;  // Afficher uniquement les favoris
  
  // --- Mode Recherche Précise ---
  date: Date | null;       // Jour spécifique
  specificTime: string | null; // Heure de début minimum (ex: "18:00")
  
  // --- Mode Comparateur Flexible ---
  weekDays: number[];      // Jours de la semaine (0=Dimanche, 1=Lundi...)
  timeRange: {
    start: string;         // Heure de début de la plage (ex: "18:00")
    end: string;           // Heure de fin de la plage (ex: "22:00")
  };
}
```

## 3. Logique de Filtrage (Algorithme)

Le filtrage s'effectue en deux passes principales :

### Étape 1 : Filtrage des Offres (Intra-Slot)
Pour chaque créneau brut, on filtre d'abord sa liste d'offres (`offers`).
*   Si un lieu (`location`) est sélectionné, on ne garde que les offres de ce lieu.
*   Si `favoritesOnly` est actif, on ne garde que les offres favorites.
*   On recalcule l'heure de fin (`end`) du créneau en fonction de la durée demandée (`start` + `duration`).

### Étape 2 : Filtrage des Créneaux (Inter-Slot)
Une fois les offres filtrées, on décide si on garde le créneau lui-même.
1.  **Rejet immédiat** : Si le créneau n'a plus aucune offre (liste `offers` vide après l'étape 1), il est supprimé.
2.  **Application du Mode** :
    *   **Mode `specific`** :
        *   On vérifie si la date du créneau correspond exactement à `filters.date`.
        *   On vérifie si l'heure du créneau est >= à `filters.specificTime`.
    *   **Mode `flexible`** :
        *   On vérifie si le jour de la semaine du créneau est inclus dans `filters.weekDays`.
        *   On vérifie si l'heure du créneau est comprise dans la plage `filters.timeRange` (inclusivement).

### Étape 3 : Tri
Les résultats finaux sont triés selon le critère utilisateur :
*   **Par heure** : Chronologique (`slot.start`).
*   **Par prix** : Basé sur le prix *minimum* disponible dans le créneau (`min(slot.offers.price)`).

## 4. Implémentation (Exemple simplifié)

Voici comment la logique est implémentée (inspiré de `App.tsx`) :

```typescript
const filteredSlots = slots.map(slot => {
  // 1. Filtrer les offres internes
  const validOffers = slot.offers.filter(offer => {
    if (location && offer.location !== location) return false;
    if (favoritesOnly && !offer.isFavorite) return false;
    return true;
  });

  return { ...slot, offers: validOffers };
}).filter(slot => {
  // 2. Filtrer le créneau lui-même
  if (slot.offers.length === 0) return false;

  if (mode === 'specific') {
    return isSameDay(slot.start, date) && slot.start >= specificTime;
  } else {
    return weekDays.includes(slot.day) && 
           slot.start >= rangeStart && 
           slot.start <= rangeEnd;
  }
});
```

## 5. Utilisation dans l'UI

*   **SlotList** : Affiche la liste filtrée. Chaque item montre le "meilleur prix" (`Math.min(...offers.price)`) et le nombre d'offres disponibles.
*   **CalendarView** : Affiche les créneaux sur une grille. La logique de grille (Lignes = Heures, Colonnes = Jours) utilise les mêmes données filtrées pour placer les créneaux.
*   **MapView** : Affiche les marqueurs des clubs présents dans les résultats filtrés.
