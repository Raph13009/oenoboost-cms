# OenoBoost — Database Schema Reference

> **Stack**: PostgreSQL (Supabase) · **Schema**: `public` · **ORM**: Prisma (recommandé)  
> **Langues**: colonnes éditoriales suffixées `_fr` / `_en`  
> **Last Update**: March 2026

---

## Conventions de nommage

| Règle | Convention |
|---|---|
| Langue | 100% anglais |
| Tables & colonnes | `snake_case` minuscule |
| Clé primaire | `id UUID` v4 (`gen_random_uuid()`) sur toutes les tables |
| Clés étrangères | `{table_singulier}_id` — ex: `region_id` |
| Timestamps | `created_at`, `updated_at` sur toutes les tables |
| Soft delete | `deleted_at TIMESTAMP NULL` sur les tables de contenu |
| Booléens | préfixe `is_` — ex: `is_premium`, `is_verified` |
| Slugs | colonne `slug` sur tout contenu avec URL publique |
| Contenu bilingue | suffixe `_fr` / `_en` — ex: `title_fr`, `title_en` |
| Status éditorial | `status VARCHAR(20) CHECK (status IN ('draft','published','archived'))` |
| GeoJSON | colonne `geojson JSONB` + `centroid_lat` / `centroid_lng DOUBLE PRECISION` |
| Contraintes enum | `CHECK (col IN (...))` — jamais de `ENUM` PostgreSQL natif |
| Email | toujours normalisé en `LOWER()` à l'insertion et à la requête |

### Trigger `updated_at`
Fonction partagée créée une seule fois, appliquée via trigger `BEFORE UPDATE` sur chaque table :
```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
```

---

## Tables

### 1. AUTH

#### `users`
Compte utilisateur principal.

| Colonne | Type | Contraintes / Défaut |
|---|---|---|
| `id` | UUID | PK, `gen_random_uuid()` |
| `email` | TEXT | NOT NULL — stocker en `LOWER()` |
| `password_hash` | TEXT | NULL si OAuth |
| `first_name` | VARCHAR(100) | |
| `last_name` | VARCHAR(100) | |
| `avatar_url` | TEXT | |
| `role` | VARCHAR(20) | DEFAULT `'user'`, CHECK IN (`'user'`,`'admin'`) |
| `plan` | VARCHAR(20) | DEFAULT `'free'`, CHECK IN (`'free'`,`'premium'`) |
| `plan_expires_at` | TIMESTAMP | NULL si free |
| `level` | VARCHAR(20) | DEFAULT `'beginner'`, CHECK IN (`'beginner'`,`'amateur'`,`'enthusiast'`,`'expert'`) |
| `streak_days` | INTEGER | DEFAULT 0 |
| `is_verified` | BOOLEAN | DEFAULT FALSE |
| `locale` | VARCHAR(5) | DEFAULT `'fr'`, CHECK IN (`'fr'`,`'en'`) |
| `created_at` | TIMESTAMP | DEFAULT NOW() |
| `updated_at` | TIMESTAMP | DEFAULT NOW() |
| `deleted_at` | TIMESTAMP | |

**Index** : `UNIQUE INDEX users_email_unique ON users (LOWER(email))`

---

#### `oauth_accounts`
Connexions OAuth (Google, etc.).

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK → `users(id)` CASCADE |
| `provider` | VARCHAR(50) | NOT NULL — ex: `'google'` |
| `provider_id` | VARCHAR(255) | NOT NULL |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | |

**Contraintes** : `UNIQUE(provider, provider_id)`  
**Index** : `idx_oauth_accounts_user_id`

---

#### `password_reset_tokens`

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK → `users(id)` CASCADE |
| `token_hash` | TEXT | UNIQUE NOT NULL — token hashé (pas le brut) |
| `expires_at` | TIMESTAMP | NOT NULL |
| `used_at` | TIMESTAMP | |
| `created_at` | TIMESTAMP | |

**Index** : `idx_password_reset_tokens_user_id`

---

### 2. MODULE 1 — VIGNOBLE

**Hiérarchie** : `wine_regions` → `wine_subregions` → `appellations`

#### `wine_regions`
~16 grandes régions viticoles françaises.

| Colonne | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `slug` | VARCHAR(100) | UNIQUE NOT NULL |
| `name_fr` / `name_en` | VARCHAR(200) | NOT NULL |
| `department_count` | INTEGER | |
| `area_hectares` | INTEGER | |
| `total_production_hl` | INTEGER | hectolitres/an |
| `main_grapes_fr` / `main_grapes_en` | TEXT | |
| `geojson` | JSONB | polygone région |
| `centroid_lat` / `centroid_lng` | DOUBLE PRECISION | pour zoom Mapbox |
| `color_hex` | VARCHAR(7) | couleur carte |
| `map_order` | INTEGER | ordre affichage |
| `status` | VARCHAR(20) | DEFAULT `'draft'` |
| `published_at` | TIMESTAMP | |
| `created_at` / `updated_at` | TIMESTAMP | |
| `deleted_at` | TIMESTAMP | |

**Index** : `idx_wine_regions_slug`, `idx_wine_regions_status`

---

#### `wine_subregions`
Sous-régions (ex: Anjou-Saumur, Touraine…).

| Colonne | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `region_id` | UUID | FK → `wine_regions(id)` CASCADE |
| `slug` | VARCHAR(100) | UNIQUE NOT NULL |
| `name_fr` / `name_en` | VARCHAR(200) | NOT NULL |
| `area_hectares` | INTEGER | |
| `description_fr` / `description_en` | TEXT | |
| `geojson` | JSONB | |
| `centroid_lat` / `centroid_lng` | DOUBLE PRECISION | |
| `map_order` | INTEGER | |
| `status` | VARCHAR(20) | DEFAULT `'draft'` |
| `published_at` | TIMESTAMP | |
| `created_at` / `updated_at` / `deleted_at` | TIMESTAMP | |

**Index** : `idx_wine_subregions_region_id`, `idx_wine_subregions_status`

---

#### `appellations`
Fiches AOP/AOC — cœur du module Vignoble. (~375+ entrées attendues)

| Colonne | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `subregion_id` | UUID | FK → `wine_subregions(id)` CASCADE |
| `slug` | VARCHAR(150) | UNIQUE NOT NULL |
| `name_fr` / `name_en` | VARCHAR(255) | NOT NULL |
| `area_hectares` | NUMERIC(10,2) | |
| `producer_count` | INTEGER | |
| `production_volume_hl` | INTEGER | |
| `price_range_min_eur` / `price_range_max_eur` | NUMERIC(8,2) | |
| `history_fr` / `history_en` | TEXT | |
| `colors_grapes_fr` / `colors_grapes_en` | TEXT | |
| `soils_description_fr` / `soils_description_en` | TEXT | |
| `geojson` | JSONB | |
| `centroid_lat` / `centroid_lng` | DOUBLE PRECISION | |
| `is_premium` | BOOLEAN | DEFAULT TRUE |
| `status` | VARCHAR(20) | DEFAULT `'draft'` |
| `published_at` | TIMESTAMP | |
| `created_at` / `updated_at` / `deleted_at` | TIMESTAMP | |

**Index** : `idx_appellations_subregion`, `idx_appellations_slug`, `idx_appellations_status`

---

#### `appellation_soil_links`
Table de liaison M1 ↔ M3.

| Colonne | Type | Contraintes |
|---|---|---|
| `appellation_id` | UUID | FK → `appellations(id)` CASCADE |
| `soil_type_id` | UUID | FK → `soil_types(id)` CASCADE |

**PK** : `(appellation_id, soil_type_id)`  
**Index** : `idx_appellation_soil_links_soil`

---

#### `appellation_grape_links`
Table de liaison M1 ↔ M2.

| Colonne | Type | Contraintes |
|---|---|---|
| `appellation_id` | UUID | FK → `appellations(id)` CASCADE |
| `grape_id` | UUID | FK → `grapes(id)` CASCADE |
| `is_primary` | BOOLEAN | DEFAULT TRUE — principal ou secondaire |

**PK** : `(appellation_id, grape_id)`  
**Index** : `idx_appellation_grape_links_grape`

---

### 3. MODULE 2 — CÉPAGES

#### `grapes`

| Colonne | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `slug` | VARCHAR(150) | UNIQUE NOT NULL |
| `name_fr` / `name_en` | VARCHAR(200) | NOT NULL |
| `type` | VARCHAR(10) | CHECK IN (`'white'`,`'red'`,`'rose'`) |
| `origin_country` | VARCHAR(100) | |
| `origin_region_fr` / `origin_region_en` | VARCHAR(200) | |
| `origin_latitude` / `origin_longitude` | DOUBLE PRECISION | pour globe 3D |
| `history_fr` / `history_en` | TEXT | |
| `crossings_fr` / `crossings_en` | TEXT | croisements génétiques |
| `production_regions_fr` / `production_regions_en` | TEXT | |
| `viticultural_traits_fr` / `viticultural_traits_en` | TEXT | |
| `tasting_traits_fr` / `tasting_traits_en` | TEXT | |
| `emblematic_wines_fr` / `emblematic_wines_en` | TEXT | |
| `is_premium` | BOOLEAN | DEFAULT TRUE |
| `status` | VARCHAR(20) | DEFAULT `'draft'` |
| `published_at` | TIMESTAMP | |
| `created_at` / `updated_at` / `deleted_at` | TIMESTAMP | |

**Index** : `idx_grapes_slug`, `idx_grapes_status`

---

### 4. MODULE 3 — SOLS & TERROIRS

#### `soil_types`

| Colonne | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `slug` | VARCHAR(100) | UNIQUE NOT NULL |
| `name_fr` / `name_en` | VARCHAR(200) | NOT NULL |
| `photo_url` | TEXT | photo pour le carrousel |
| `geological_origin_fr` / `geological_origin_en` | TEXT | |
| `regions_fr` / `regions_en` | TEXT | |
| `mineral_composition_fr` / `mineral_composition_en` | TEXT | |
| `wine_influence_fr` / `wine_influence_en` | TEXT | |
| `emblematic_aop_fr` / `emblematic_aop_en` | TEXT | |
| `carousel_order` | INTEGER | |
| `is_premium` | BOOLEAN | DEFAULT TRUE |
| `status` | VARCHAR(20) | DEFAULT `'draft'` |
| `published_at` | TIMESTAMP | |
| `created_at` / `updated_at` / `deleted_at` | TIMESTAMP | |

**Index** : `idx_soil_types_status`, `idx_soil_types_carousel_order`

---

### 5. MODULE 4 — VINIFICATION

#### `vinification_types`

| Colonne | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `slug` | VARCHAR(100) | UNIQUE NOT NULL |
| `name_fr` / `name_en` | VARCHAR(200) | NOT NULL |
| `illustration_url` | TEXT | |
| `carousel_order` | INTEGER | |
| `is_premium` | BOOLEAN | DEFAULT TRUE |
| `status` | VARCHAR(20) | DEFAULT `'draft'` |
| `published_at` | TIMESTAMP | |
| `created_at` / `updated_at` / `deleted_at` | TIMESTAMP | |

**Index** : `idx_vinification_types_status`, `idx_vinification_types_carousel_order`

---

#### `vinification_steps`
Étapes de la timeline pour chaque type de vinification.

| Colonne | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `vinification_type_id` | UUID | FK → `vinification_types(id)` CASCADE |
| `step_order` | INTEGER | NOT NULL |
| `icon_url` | TEXT | |
| `title_fr` / `title_en` | VARCHAR(255) | NOT NULL |
| `summary_fr` / `summary_en` | TEXT | résumé court sur la timeline |
| `detail_fr` / `detail_en` | TEXT | bloc accordéon détaillé |
| `created_at` / `updated_at` | TIMESTAMP | |

**Contrainte** : `UNIQUE(vinification_type_id, step_order)`  
**Index** : `idx_vinification_steps_type`

---

### 6. MODULE 5 — DÉGUSTATION

#### `tasting_sheets`
Fiches sauvegardées. Les sessions interactives sont gérées côté client ; seules les fiches complètes sont persistées.

| Colonne | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK → `users(id)` CASCADE |
| `eye_color` | VARCHAR(100) | |
| `eye_robe` | VARCHAR(100) | |
| `eye_intensity` | VARCHAR(50) | |
| `eye_tears` | VARCHAR(50) | |
| `eye_notes` | TEXT | |
| `nose_first_nose` | TEXT | |
| `nose_second_nose` | TEXT | |
| `nose_aroma_families` | JSONB | array des familles sélectionnées |
| `nose_intensity` | VARCHAR(50) | |
| `nose_notes` | TEXT | |
| `mouth_attack` | VARCHAR(50) | |
| `mouth_mid` | VARCHAR(50) | |
| `mouth_finish` | VARCHAR(50) | |
| `mouth_acidity` | INTEGER | CHECK BETWEEN 1 AND 10 |
| `mouth_tannins` | INTEGER | CHECK BETWEEN 1 AND 10 |
| `mouth_alcohol` | INTEGER | CHECK BETWEEN 1 AND 10 |
| `mouth_sugar` | INTEGER | CHECK BETWEEN 1 AND 10 |
| `mouth_length_caudalie` | INTEGER | CHECK BETWEEN 1 AND 10 |
| `mouth_notes` | TEXT | |
| `wine_name` | VARCHAR(255) | |
| `vintage` | INTEGER | CHECK BETWEEN 1700 AND année courante |
| `created_at` / `updated_at` | TIMESTAMP | |

**Index** : `idx_tasting_sheets_user`

---

### 7. MODULE 6 — DICTIONNAIRE

#### `dictionary_terms`

| Colonne | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `slug` | VARCHAR(150) | UNIQUE NOT NULL |
| `term_fr` / `term_en` | VARCHAR(255) | NOT NULL |
| `definition_fr` / `definition_en` | TEXT | NOT NULL |
| `examples_fr` / `examples_en` | TEXT | |
| `etymology_fr` / `etymology_en` | TEXT | |
| `related_modules` | JSONB | ex: `['vinification','terroir']` |
| `is_word_of_day` | BOOLEAN | DEFAULT FALSE |
| `is_premium` | BOOLEAN | DEFAULT FALSE |
| `free_order` | INTEGER | position dans les 50 gratuits |
| `status` | VARCHAR(20) | DEFAULT `'draft'` |
| `published_at` | TIMESTAMP | |
| `created_at` / `updated_at` / `deleted_at` | TIMESTAMP | |

**Index** : `idx_dictionary_terms_status`, `idx_dictionary_terms_free_order`, `idx_dictionary_terms_word_of_day`

---

### 8. QUIZZ

#### `quiz_questions`
Toutes les questions (quizz + question du jour).

| Colonne | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `type` | VARCHAR(20) | CHECK IN (`'daily'`,`'beginner'`,`'intermediate'`,`'expert'`,`'thematic'`) |
| `theme` | VARCHAR(100) | |
| `question_fr` / `question_en` | TEXT | NOT NULL |
| `option_a_fr` / `option_a_en` | VARCHAR(500) | NOT NULL |
| `option_b_fr` / `option_b_en` | VARCHAR(500) | NOT NULL |
| `option_c_fr` / `option_c_en` | VARCHAR(500) | nullable |
| `option_d_fr` / `option_d_en` | VARCHAR(500) | nullable |
| `correct_option` | CHAR(1) | NOT NULL, CHECK IN (`'a'`,`'b'`,`'c'`,`'d'`) |
| `explanation_fr` / `explanation_en` | TEXT | affiché si mauvaise réponse |
| `related_module` | VARCHAR(50) | slug du module lié |
| `scheduled_date` | DATE | pour la question du jour |
| `is_premium` | BOOLEAN | DEFAULT FALSE |
| `status` | VARCHAR(20) | DEFAULT `'draft'` |
| `created_at` / `updated_at` | TIMESTAMP | |

**Index** : `idx_quiz_questions_type`, `idx_quiz_questions_scheduled_date`

---

#### `quiz_sessions`
Session de quizz complète d'un utilisateur.

| Colonne | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK → `users(id)` CASCADE |
| `quiz_type` | VARCHAR(20) | CHECK IN (mêmes valeurs que `quiz_questions.type`) |
| `theme` | VARCHAR(100) | |
| `score` | INTEGER | DEFAULT 0 |
| `total` | INTEGER | NOT NULL |
| `score_pct` | NUMERIC(5,2) | |
| `time_taken_s` | INTEGER | durée en secondes |
| `completed_at` | TIMESTAMP | |
| `created_at` | TIMESTAMP | |

**Index** : `idx_quiz_sessions_user`, `idx_quiz_sessions_type`

---

#### `quiz_answers`
Réponses individuelles par question dans une session.

| Colonne | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `session_id` | UUID | FK → `quiz_sessions(id)` CASCADE |
| `question_id` | UUID | FK → `quiz_questions(id)` |
| `selected_option` | CHAR(1) | CHECK IN (`'a'`,`'b'`,`'c'`,`'d'`) |
| `is_correct` | BOOLEAN | |
| `answered_at` | TIMESTAMP | DEFAULT NOW() |

**Contrainte** : `UNIQUE(session_id, question_id)`  
**Index** : `idx_quiz_answers_session`

---

#### `user_daily_question_log`
Suivi des questions du jour — évite les répétitions (`UNIQUE` sur `user_id, question_id`).

| Colonne | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK → `users(id)` CASCADE |
| `question_id` | UUID | FK → `quiz_questions(id)` |
| `shown_date` | DATE | DEFAULT `CURRENT_DATE` |
| `is_correct` | BOOLEAN | |
| `answered_at` | TIMESTAMP | |

**Contrainte** : `UNIQUE(user_id, question_id)`  
**Index** : `idx_user_daily_question_log_user`

---

### 9. FAVORIS

#### `favorites`
Polymorphe — couvre tous les modules. Limite applicative : 5 items pour les utilisateurs `free`.

| Colonne | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK → `users(id)` CASCADE |
| `content_type` | VARCHAR(50) | CHECK IN (`'appellation'`,`'grape'`,`'soil_type'`,`'vinification_type'`,`'dictionary_term'`) |
| `content_id` | UUID | ID de l'entité sauvegardée (pas de FK — polymorphe) |
| `module` | VARCHAR(50) | CHECK IN (`'vignoble'`,`'cepages'`,`'sols'`,`'vinification'`,`'dictionnaire'`) |
| `created_at` | TIMESTAMP | |

**Contrainte** : `UNIQUE(user_id, content_type, content_id)`  
**Index** : `idx_favorites_user`

> ⚠️ La limite de 5 favoris pour les `free` est vérifiée côté applicatif avant chaque INSERT.

---

### 10. NOUVEAUTÉS / BLOG

#### `news_articles`

| Colonne | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `slug` | VARCHAR(200) | UNIQUE NOT NULL |
| `title_fr` / `title_en` | VARCHAR(500) | NOT NULL |
| `excerpt_fr` / `excerpt_en` | TEXT | |
| `content_fr` / `content_en` | TEXT | |
| `cover_url` | TEXT | |
| `module_tag` | VARCHAR(50) | module associé |
| `content_type` | VARCHAR(50) | type de contenu |
| `linked_id` | UUID | ID du contenu lié dans un module |
| `is_premium_early` | BOOLEAN | DEFAULT FALSE — accès 48h en avance pour Premium |
| `status` | VARCHAR(20) | DEFAULT `'draft'` |
| `published_at` | TIMESTAMP | |
| `created_at` / `updated_at` / `deleted_at` | TIMESTAMP | |

**Index** : `idx_news_articles_slug`, `idx_news_articles_status`, `idx_news_articles_published_at`

---

### 11. ABONNEMENTS & PAIEMENT

#### `subscriptions`
Abonnements Stripe.

| Colonne | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK → `users(id)` CASCADE |
| `stripe_customer_id` | VARCHAR(255) | UNIQUE |
| `stripe_subscription_id` | VARCHAR(255) | UNIQUE |
| `stripe_price_id` | VARCHAR(255) | |
| `plan` | VARCHAR(20) | CHECK IN (`'free'`,`'premium'`) |
| `status` | VARCHAR(30) | CHECK IN (`'active'`,`'canceled'`,`'past_due'`,`'trialing'`,`'incomplete'`,`'incomplete_expired'`,`'unpaid'`) |
| `current_period_start` / `current_period_end` | TIMESTAMP | |
| `canceled_at` | TIMESTAMP | |
| `created_at` / `updated_at` | TIMESTAMP | |

**Index** : `idx_subscriptions_user`

---

#### `invoices`

| Colonne | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK → `users(id)` |
| `subscription_id` | UUID | FK → `subscriptions(id)` |
| `stripe_invoice_id` | VARCHAR(255) | UNIQUE |
| `amount_eur` | NUMERIC(10,2) | |
| `status` | VARCHAR(30) | CHECK IN (`'paid'`,`'open'`,`'void'`,`'uncollectible'`,`'draft'`) |
| `invoice_pdf_url` | TEXT | |
| `paid_at` | TIMESTAMP | |
| `created_at` | TIMESTAMP | |

**Index** : `idx_invoices_user`

---

### 12. NOTIFICATIONS

#### `notification_preferences`
Une ligne par utilisateur (`UNIQUE` sur `user_id`).

| Colonne | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | UNIQUE, FK → `users(id)` CASCADE |
| `notify_news_email` | BOOLEAN | DEFAULT FALSE |
| `notify_daily_question` | BOOLEAN | DEFAULT TRUE |
| `notify_quiz_reminders` | BOOLEAN | DEFAULT FALSE |
| `created_at` / `updated_at` | TIMESTAMP | |

---

## Liens croisés entre modules

| Source | Action | Destination |
|---|---|---|
| `appellations` | `subregion_id` | `wine_subregions` |
| `wine_subregions` | `region_id` | `wine_regions` |
| `appellation_soil_links` | liaison | `appellations` ↔ `soil_types` |
| `appellation_grape_links` | liaison | `appellations` ↔ `grapes` |
| `vinification_steps` | `vinification_type_id` | `vinification_types` |
| `favorites` | `content_id` (polymorphe) | toutes tables de contenu |
| `subscriptions` | `user_id` | `users` |

### Liens applicatifs (routing)
| Écran origine | Clic utilisateur | Destination |
|---|---|---|
| Fiche AOP (M1) | type de sol | Fiche Sol (M3) |
| Fiche AOP (M1) | cépage | Fiche Cépage (M2) |
| Fiche Sol (M3) | AOP | Fiche AOP (M1) |
| Fiche Vinification (M4) | terme technique | Fiche Dictionnaire (M6) |
| Fiche Dictionnaire (M6) | tag module | Page d'entrée du module |
| Résultats Quizz | "Aller au module" | Module lié à la question ratée |

---

## Règles Freemium

| Fonctionnalité | Gratuit | Premium |
|---|---|---|
| Accès modules | 20% du contenu | 100% |
| Carte viticole | Lecture seule | Interactif complet |
| Dictionnaire | 50 termes (`free_order <= 50`) | Illimité |
| Question du Jour | ✓ | ✓ |
| Quizz avancés | ✗ Paywall | ✓ |
| Favoris | 5 max (check applicatif) | Illimité |
| Fiche dégustation | ✗ Paywall | ✓ |
| Nouveautés | Standard | 48h en avance |

---

## Points ouverts

- [ ] **Niveaux utilisateur** — seuils de score pour `beginner → amateur → enthusiast → expert`
- [ ] **Blog** — `news_articles` couvre les nouveautés ; une page éditoriale distincte est à préciser
- [ ] **Médias** — images/illustrations stockées sur S3/Cloudflare R2 ; URLs en BDD, fichiers hors BDD
- [ ] **Full-text search** — index `tsvector` PostgreSQL à ajouter sur les tables de contenu
- [ ] **Migrations** — stratégie Prisma Migrate à définir

**Visuel Diagram**

users
 ├─ oauth_accounts
 ├─ subscriptions
 ├─ quiz_sessions
 │   └─ quiz_answers
 ├─ tasting_sheets
 └─ favorites

wine_regions
 └─ wine_subregions
      └─ appellations
           ├─ appellation_grape_links → grapes
           └─ appellation_soil_links → soil_types
