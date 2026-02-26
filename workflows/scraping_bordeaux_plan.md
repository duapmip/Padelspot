---
description: Plan pour scraper les clubs de Padel à Bordeaux
---

# Plan détaillé : Intégration de tous les Padel Clubs de Bordeaux

Actuellement, seul "Big Padel Mérignac" dispose d'un scraper fonctionnel basé sur l'APi Doinsport. Les autres clubs (4PADEL, UCPA, Padel 33) utilisent des "Mocks" (fausses données). Le but est de créer de vrais scrapers pour l'ensemble des clubs de l'agglomération bordelaise.

Voici le plan pour accomplir cette mission :

## 1. Remplacer les Mocks actuels par de vrais Scrapers

*   **Padel 33 (Bordeaux Nord & Mérignac) / Squashbad33** 
    *   *Technologie présumée :* MatchPoint / Syltek / Appli Padel33
    *   *Action :* Intercepter les requêtes réseau de leur plateforme de réservation et créer un adaptateur MatchPoint/Syltek.
*   **4PADEL Bordeaux**
    *   *Technologie présumée :* Resamania ou plateforme propriétaire (disponible aussi sur Anybuddy).
    *   *Action :* Soit utiliser Playwright pour scraper leur nouveau portail (`book.4padel.fr`), soit rétro-ingénierier l'API Anybuddy pour récupérer les créneaux 4PADEL plus facilement.
*   **UCPA Sport Station Bordeaux**
    *   *Technologie présumée :* Réservation via un portail UCPA spécifique (souvent Resamania ou Deciplus).
    *   *Action :* Analyser les requêtes de leur portail en ligne.

## 2. Intégrer les nouveaux Clubs de la métropole

D'après nos recherches, les principaux clubs manquants sont :

*   **Padel House (Cenon)**
    *   *Disponibilité :* Réservation via leur site web / app (qui semble utiliser le moteur Doinsport également) et via Anybuddy.
    *   *Action :* Vérifier s'ils utilisent Doinsport (plus facile car l'adaptateur est déjà codé) ou créer un connecteur Anybuddy global.
*   **MB Padel - Padel Bordeaux (Sainte-Eulalie)**
    *   *Action :* Analyser leur site (`mbpadel33.fr`) pour identifier leur moteur de réservation (souvent Doinsport ou Gestion Sports).
*   **3D Padel (Le Haillan)**
    *   *Action :* Vérifier de la même manière leur plateforme de résa en ligne.
*   **US Cenon / Villa Primrose (Extérieurs / Tennis clubs)**
    *   *Technologie présumée :* Ten'Up (FFT).
    *   *Action :* Faire un scraper expérimental pour récupérer les créneaux Ten'Up, bien que cette API soit souvent plus verrouillée.

## 3. Stratégie proposée & Déroulement des prochaines étapes

L'objectif est d'avancer API par API, car une même API gère souvent plusieurs clubs :

**Étape A : Consolider l'API Doinsport**
Vérifier si "Padel House" ou "3D Padel" utilisent Doinsport. Si oui, on peut juste ajouter leur `CLUB_ID` et `ACTIVITY_ID` à notre adaptateur existant pour doubler notre catalogue en 10 minutes !

**Étape B : L'API Anybuddy (La mine d'or)**
Beaucoup de ces clubs (4PADEL, Padel House, etc.) listent leurs terrains vides sur l'application **Anybuddy**.
Plutôt que de faire 4 scrapers différents, on devrait en priorité tenter d'intercepter l'API d'Anybuddy pour Bordeaux. Cela nous remonterait énormément de créneaux en une seule grosse requête.

**Étape C : Les plateformes propriétaires (MatchPoint, Resamania)**
Une fois les "gros fournisseurs" réglés, on créera des scrapers dédiés pour les spécificités comme Padel 33 (qui fonctionne fortement sur son écosystème MatchPoint).

## 4. Ce que nous devons faire tout de suite
1. Extraire la liste de tous les clubs via Anybuddy ou leurs interfaces web.
2. Ouvrir le panneau réseau de notre navigateur respectif sur leurs sites pour identifier l'URL de l'API.
3. Implémenter l'API `Anybuddy` ou étendre `Doinsport` selon ce qui est le plus rentable.
