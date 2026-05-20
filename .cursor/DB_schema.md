## Table `aop`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int4` | Primary |
| `name` | `text` |  |
| `area_m2` | `float8` |  Nullable |
| `slug` | `varchar` |  |
| `area_hectares` | `numeric` |  Nullable |
| `producer_count` | `int4` |  Nullable |
| `production_volume_hl` | `int4` |  Nullable |
| `price_range_min_eur` | `numeric` |  Nullable |
| `price_range_max_eur` | `numeric` |  Nullable |
| `history_fr` | `text` |  Nullable |
| `history_en` | `text` |  Nullable |
| `colors_grapes_fr` | `text` |  Nullable |
| `colors_grapes_en` | `text` |  Nullable |
| `soils_description_fr` | `text` |  Nullable |
| `soils_description_en` | `text` |  Nullable |
| `wine_pct_red` | `int2` |  Nullable |
| `wine_pct_white` | `int2` |  Nullable |
| `wine_pct_sparkling` | `int2` |  Nullable |
| `wine_pct_liqueur` | `int2` |  Nullable |
| `is_premium` | `bool` |  |
| `status` | `varchar` |  |
| `published_at` | `timestamp` |  Nullable |
| `created_at` | `timestamp` |  Nullable |
| `updated_at` | `timestamp` |  Nullable |
| `deleted_at` | `timestamp` |  Nullable |

## Table `aop_soil_link`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `aop_id` | `int4` | Primary |
| `soil_type_id` | `uuid` | Primary |

## Table `aop_subregion_link`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `aop_id` | `int4` | Primary |
| `subregion_id` | `int4` | Primary |

## Table `appellation_commune_links`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `appellation_id` | `uuid` | Primary |
| `commune_id` | `uuid` | Primary |
| `created_at` | `timestamp` |  |

## Table `appellation_grape_links`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `appellation_id` | `uuid` | Primary |
| `grape_id` | `uuid` | Primary |
| `is_primary` | `bool` |  Nullable |

## Table `appellation_soil_links`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `appellation_id` | `uuid` | Primary |
| `soil_type_id` | `uuid` | Primary |

## Table `appellation_subregion_links`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `appellation_id` | `uuid` | Primary |
| `subregion_id` | `uuid` | Primary |
| `created_at` | `timestamp` |  Nullable |

## Table `appellations`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `slug` | `varchar` |  Unique |
| `name_fr` | `varchar` |  |
| `name_en` | `varchar` |  |
| `area_hectares` | `numeric` |  Nullable |
| `producer_count` | `int4` |  Nullable |
| `production_volume_hl` | `int4` |  Nullable |
| `price_range_min_eur` | `numeric` |  Nullable |
| `price_range_max_eur` | `numeric` |  Nullable |
| `history_fr` | `text` |  Nullable |
| `history_en` | `text` |  Nullable |
| `colors_grapes_fr` | `text` |  Nullable |
| `colors_grapes_en` | `text` |  Nullable |
| `soils_description_fr` | `text` |  Nullable |
| `soils_description_en` | `text` |  Nullable |
| `geojson` | `jsonb` |  Nullable |
| `centroid_lat` | `float8` |  Nullable |
| `centroid_lng` | `float8` |  Nullable |
| `is_premium` | `bool` |  Nullable |
| `status` | `varchar` |  Nullable |
| `published_at` | `timestamp` |  Nullable |
| `created_at` | `timestamp` |  Nullable |
| `updated_at` | `timestamp` |  Nullable |
| `deleted_at` | `timestamp` |  Nullable |

## Table `appellations_backup2`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` |  Nullable |
| `slug` | `varchar` |  Nullable |
| `name_fr` | `varchar` |  Nullable |
| `name_en` | `varchar` |  Nullable |
| `area_hectares` | `numeric` |  Nullable |
| `producer_count` | `int4` |  Nullable |
| `production_volume_hl` | `int4` |  Nullable |
| `price_range_min_eur` | `numeric` |  Nullable |
| `price_range_max_eur` | `numeric` |  Nullable |
| `history_fr` | `text` |  Nullable |
| `history_en` | `text` |  Nullable |
| `colors_grapes_fr` | `text` |  Nullable |
| `colors_grapes_en` | `text` |  Nullable |
| `soils_description_fr` | `text` |  Nullable |
| `soils_description_en` | `text` |  Nullable |
| `geojson` | `jsonb` |  Nullable |
| `centroid_lat` | `float8` |  Nullable |
| `centroid_lng` | `float8` |  Nullable |
| `is_premium` | `bool` |  Nullable |
| `status` | `varchar` |  Nullable |
| `published_at` | `timestamp` |  Nullable |
| `created_at` | `timestamp` |  Nullable |
| `updated_at` | `timestamp` |  Nullable |
| `deleted_at` | `timestamp` |  Nullable |

## Table `communes`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  |
| `geometry` | `geometry` |  |
| `code_insee` | `text` |  Nullable |

## Table `communes_full`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `code_insee` | `text` | Primary |
| `name` | `text` |  |
| `geometry` | `geometry` |  Nullable |

## Table `communes_full_aop_link`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `commune_code_insee` | `text` | Primary |
| `aop_id` | `int4` | Primary |

## Table `communes_full_subregion_link`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `commune_code_insee` | `text` | Primary |
| `subregion_id` | `int4` | Primary |

## Table `dictionary_terms`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `slug` | `varchar` |  Unique |
| `term_fr` | `varchar` |  |
| `term_en` | `varchar` |  |
| `definition_fr` | `text` |  |
| `definition_en` | `text` |  |
| `examples_fr` | `text` |  Nullable |
| `examples_en` | `text` |  Nullable |
| `etymology_fr` | `text` |  Nullable |
| `etymology_en` | `text` |  Nullable |
| `related_modules` | `jsonb` |  Nullable |
| `is_word_of_day` | `bool` |  Nullable |
| `is_premium` | `bool` |  Nullable |
| `free_order` | `int4` |  Nullable |
| `status` | `varchar` |  Nullable |
| `published_at` | `timestamp` |  Nullable |
| `created_at` | `timestamp` |  Nullable |
| `updated_at` | `timestamp` |  Nullable |
| `deleted_at` | `timestamp` |  Nullable |

## Table `favorites`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `content_type` | `varchar` |  |
| `content_id` | `text` |  |
| `module` | `varchar` |  Nullable |
| `created_at` | `timestamp` |  Nullable |

## Table `grapes`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `slug` | `varchar` |  Unique |
| `name_fr` | `varchar` |  |
| `name_en` | `varchar` |  |
| `type` | `varchar` |  Nullable |
| `origin_country` | `varchar` |  Nullable |
| `origin_region_fr` | `varchar` |  Nullable |
| `origin_region_en` | `varchar` |  Nullable |
| `origin_latitude` | `float8` |  Nullable |
| `origin_longitude` | `float8` |  Nullable |
| `history_fr` | `text` |  Nullable |
| `history_en` | `text` |  Nullable |
| `crossings_fr` | `text` |  Nullable |
| `crossings_en` | `text` |  Nullable |
| `production_regions_fr` | `text` |  Nullable |
| `production_regions_en` | `text` |  Nullable |
| `viticultural_traits_fr` | `text` |  Nullable |
| `viticultural_traits_en` | `text` |  Nullable |
| `tasting_traits_fr` | `text` |  Nullable |
| `tasting_traits_en` | `text` |  Nullable |
| `emblematic_wines_fr` | `text` |  Nullable |
| `emblematic_wines_en` | `text` |  Nullable |
| `is_premium` | `bool` |  Nullable |
| `status` | `varchar` |  Nullable |
| `published_at` | `timestamp` |  Nullable |
| `created_at` | `timestamp` |  Nullable |
| `updated_at` | `timestamp` |  Nullable |
| `deleted_at` | `timestamp` |  Nullable |
| `production_countries` | `jsonb` |  Nullable |

## Table `invoices`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `subscription_id` | `uuid` |  Nullable |
| `stripe_invoice_id` | `varchar` |  Nullable Unique |
| `amount_eur` | `numeric` |  Nullable |
| `status` | `varchar` |  Nullable |
| `invoice_pdf_url` | `text` |  Nullable |
| `paid_at` | `timestamp` |  Nullable |
| `created_at` | `timestamp` |  Nullable |

## Table `news_articles`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `slug` | `varchar` |  Unique |
| `title_fr` | `varchar` |  |
| `title_en` | `varchar` |  |
| `excerpt_fr` | `text` |  Nullable |
| `excerpt_en` | `text` |  Nullable |
| `content_fr` | `text` |  Nullable |
| `content_en` | `text` |  Nullable |
| `cover_url` | `text` |  Nullable |
| `module_tag` | `varchar` |  Nullable |
| `content_type` | `varchar` |  Nullable |
| `linked_id` | `uuid` |  Nullable |
| `is_premium_early` | `bool` |  Nullable |
| `status` | `varchar` |  Nullable |
| `published_at` | `timestamp` |  Nullable |
| `created_at` | `timestamp` |  Nullable |
| `updated_at` | `timestamp` |  Nullable |
| `deleted_at` | `timestamp` |  Nullable |

## Table `notification_preferences`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  Unique |
| `notify_news_email` | `bool` |  Nullable |
| `notify_daily_question` | `bool` |  Nullable |
| `notify_quiz_reminders` | `bool` |  Nullable |
| `created_at` | `timestamp` |  Nullable |
| `updated_at` | `timestamp` |  Nullable |

## Table `oauth_accounts`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `provider` | `varchar` |  |
| `provider_id` | `varchar` |  |
| `created_at` | `timestamp` |  Nullable |
| `updated_at` | `timestamp` |  Nullable |

## Table `password_reset_tokens`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `token_hash` | `text` |  Unique |
| `expires_at` | `timestamp` |  |
| `used_at` | `timestamp` |  Nullable |
| `created_at` | `timestamp` |  Nullable |

## Table `quiz_answers`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `session_id` | `uuid` |  |
| `question_id` | `uuid` |  |
| `selected_option` | `bpchar` |  Nullable |
| `is_correct` | `bool` |  Nullable |
| `answered_at` | `timestamp` |  Nullable |

## Table `quiz_question_links`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `quiz_id` | `uuid` | Primary |
| `question_id` | `uuid` | Primary |
| `position` | `int4` |  |

## Table `quiz_questions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `type` | `varchar` |  Nullable |
| `theme` | `varchar` |  Nullable |
| `question_fr` | `text` |  |
| `question_en` | `text` |  |
| `option_a_fr` | `varchar` |  |
| `option_a_en` | `varchar` |  |
| `option_b_fr` | `varchar` |  |
| `option_b_en` | `varchar` |  |
| `option_c_fr` | `varchar` |  Nullable |
| `option_c_en` | `varchar` |  Nullable |
| `option_d_fr` | `varchar` |  Nullable |
| `option_d_en` | `varchar` |  Nullable |
| `correct_option` | `bpchar` |  |
| `explanation_fr` | `text` |  Nullable |
| `explanation_en` | `text` |  Nullable |
| `related_module` | `varchar` |  Nullable |
| `scheduled_date` | `date` |  Nullable |
| `is_premium` | `bool` |  Nullable |
| `status` | `varchar` |  Nullable |
| `created_at` | `timestamp` |  Nullable |
| `updated_at` | `timestamp` |  Nullable |
| `difficulty` | `varchar` |  Nullable |

## Table `quiz_sessions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `quiz_type` | `varchar` |  Nullable |
| `theme` | `varchar` |  Nullable |
| `score` | `int4` |  Nullable |
| `total` | `int4` |  |
| `score_pct` | `numeric` |  Nullable |
| `time_taken_s` | `int4` |  Nullable |
| `completed_at` | `timestamp` |  Nullable |
| `created_at` | `timestamp` |  Nullable |
| `quiz_id` | `uuid` |  Nullable |
| `xp_awarded` | `bool` |  |

## Table `quizzes`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `type` | `varchar` |  |
| `theme` | `varchar` |  Nullable |
| `title_fr` | `text` |  |
| `title_en` | `text` |  Nullable |
| `description_fr` | `text` |  Nullable |
| `description_en` | `text` |  Nullable |
| `question_count` | `int4` |  Nullable |
| `duration_sec` | `int4` |  Nullable |
| `is_premium` | `bool` |  Nullable |
| `status` | `varchar` |  Nullable |
| `created_at` | `timestamp` |  Nullable |
| `updated_at` | `timestamp` |  Nullable |

## Table `soil_types`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `slug` | `varchar` |  Unique |
| `name_fr` | `varchar` |  |
| `name_en` | `varchar` |  |
| `photo_url` | `text` |  Nullable |
| `geological_origin_fr` | `text` |  Nullable |
| `geological_origin_en` | `text` |  Nullable |
| `regions_fr` | `text` |  Nullable |
| `regions_en` | `text` |  Nullable |
| `mineral_composition_fr` | `text` |  Nullable |
| `mineral_composition_en` | `text` |  Nullable |
| `wine_influence_fr` | `text` |  Nullable |
| `wine_influence_en` | `text` |  Nullable |
| `emblematic_aop_fr` | `text` |  Nullable |
| `emblematic_aop_en` | `text` |  Nullable |
| `carousel_order` | `int4` |  Nullable |
| `is_premium` | `bool` |  Nullable |
| `status` | `varchar` |  Nullable |
| `published_at` | `timestamp` |  Nullable |
| `created_at` | `timestamp` |  Nullable |
| `updated_at` | `timestamp` |  Nullable |
| `deleted_at` | `timestamp` |  Nullable |

## Table `spatial_ref_sys`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `srid` | `int4` | Primary |
| `auth_name` | `varchar` |  Nullable |
| `auth_srid` | `int4` |  Nullable |
| `srtext` | `varchar` |  Nullable |
| `proj4text` | `varchar` |  Nullable |

## Table `subregions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int4` | Primary Identity |
| `region_id` | `uuid` |  |
| `name` | `text` |  |
| `slug` | `text` |  |
| `name_fr` | `text` |  |
| `name_en` | `text` |  |
| `description_fr` | `text` |  Nullable |
| `description_en` | `text` |  Nullable |
| `area_hectares` | `numeric` |  Nullable |
| `centroid_lat` | `float8` |  Nullable |
| `centroid_lng` | `float8` |  Nullable |
| `color_hex` | `text` |  Nullable |
| `map_order` | `int4` |  Nullable |
| `status` | `varchar` |  |
| `published_at` | `timestamp` |  Nullable |
| `created_at` | `timestamp` |  Nullable |
| `updated_at` | `timestamp` |  Nullable |
| `deleted_at` | `timestamp` |  Nullable |

## Table `subscriptions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `stripe_customer_id` | `varchar` |  Nullable Unique |
| `stripe_subscription_id` | `varchar` |  Nullable Unique |
| `stripe_price_id` | `varchar` |  Nullable |
| `plan` | `varchar` |  Nullable |
| `status` | `varchar` |  Nullable |
| `current_period_start` | `timestamp` |  Nullable |
| `current_period_end` | `timestamp` |  Nullable |
| `canceled_at` | `timestamp` |  Nullable |
| `created_at` | `timestamp` |  Nullable |
| `updated_at` | `timestamp` |  Nullable |

## Table `tasting_sheets`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `eye_color` | `varchar` |  Nullable |
| `eye_robe` | `varchar` |  Nullable |
| `eye_intensity` | `varchar` |  Nullable |
| `eye_tears` | `varchar` |  Nullable |
| `eye_notes` | `text` |  Nullable |
| `nose_first_nose` | `text` |  Nullable |
| `nose_second_nose` | `text` |  Nullable |
| `nose_aroma_families` | `jsonb` |  Nullable |
| `nose_intensity` | `varchar` |  Nullable |
| `nose_notes` | `text` |  Nullable |
| `mouth_attack` | `varchar` |  Nullable |
| `mouth_mid` | `varchar` |  Nullable |
| `mouth_finish` | `varchar` |  Nullable |
| `mouth_acidity` | `int4` |  Nullable |
| `mouth_tannins` | `int4` |  Nullable |
| `mouth_alcohol` | `int4` |  Nullable |
| `mouth_sugar` | `int4` |  Nullable |
| `mouth_length_caudalie` | `int4` |  Nullable |
| `mouth_notes` | `text` |  Nullable |
| `wine_name` | `varchar` |  Nullable |
| `vintage` | `int4` |  Nullable |
| `created_at` | `timestamp` |  Nullable |
| `updated_at` | `timestamp` |  Nullable |

## Table `user_daily_question_log`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `question_id` | `uuid` |  |
| `shown_date` | `date` |  |
| `is_correct` | `bool` |  Nullable |
| `answered_at` | `timestamp` |  Nullable |

## Table `users`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `email` | `text` |  |
| `password_hash` | `text` |  Nullable |
| `first_name` | `varchar` |  Nullable |
| `last_name` | `varchar` |  Nullable |
| `avatar_url` | `text` |  Nullable |
| `role` | `varchar` |  Nullable |
| `plan` | `varchar` |  Nullable |
| `plan_expires_at` | `timestamp` |  Nullable |
| `level` | `varchar` |  Nullable |
| `streak_days` | `int4` |  Nullable |
| `is_verified` | `bool` |  Nullable |
| `locale` | `varchar` |  Nullable |
| `created_at` | `timestamp` |  Nullable |
| `updated_at` | `timestamp` |  Nullable |
| `deleted_at` | `timestamp` |  Nullable |
| `xp` | `int4` |  Nullable |

## Table `vinification_steps`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `vinification_type_id` | `uuid` |  |
| `step_order` | `int4` |  |
| `icon_url` | `text` |  Nullable |
| `title_fr` | `varchar` |  |
| `title_en` | `varchar` |  |
| `summary_fr` | `text` |  Nullable |
| `summary_en` | `text` |  Nullable |
| `detail_fr` | `text` |  Nullable |
| `detail_en` | `text` |  Nullable |
| `created_at` | `timestamp` |  Nullable |
| `updated_at` | `timestamp` |  Nullable |

## Table `vinification_types`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `slug` | `varchar` |  Unique |
| `name_fr` | `varchar` |  |
| `name_en` | `varchar` |  |
| `illustration_url` | `text` |  Nullable |
| `carousel_order` | `int4` |  Nullable |
| `is_premium` | `bool` |  Nullable |
| `status` | `varchar` |  Nullable |
| `published_at` | `timestamp` |  Nullable |
| `created_at` | `timestamp` |  Nullable |
| `updated_at` | `timestamp` |  Nullable |
| `deleted_at` | `timestamp` |  Nullable |

## Table `wine_regions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `slug` | `varchar` |  Unique |
| `name_fr` | `varchar` |  |
| `name_en` | `varchar` |  |
| `department_count` | `int4` |  Nullable |
| `area_hectares` | `int4` |  Nullable |
| `total_production_hl` | `int4` |  Nullable |
| `main_grapes_fr` | `text` |  Nullable |
| `main_grapes_en` | `text` |  Nullable |
| `geojson` | `jsonb` |  Nullable |
| `centroid_lat` | `float8` |  Nullable |
| `centroid_lng` | `float8` |  Nullable |
| `color_hex` | `varchar` |  Nullable |
| `map_order` | `int4` |  Nullable |
| `status` | `varchar` |  Nullable |
| `published_at` | `timestamp` |  Nullable |
| `created_at` | `timestamp` |  Nullable |
| `updated_at` | `timestamp` |  Nullable |
| `deleted_at` | `timestamp` |  Nullable |

## Table `wine_subregions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `region_id` | `uuid` |  |
| `slug` | `varchar` |  Unique |
| `name_fr` | `varchar` |  |
| `name_en` | `varchar` |  |
| `area_hectares` | `int4` |  Nullable |
| `description_fr` | `text` |  Nullable |
| `description_en` | `text` |  Nullable |
| `geojson` | `jsonb` |  Nullable |
| `centroid_lat` | `float8` |  Nullable |
| `centroid_lng` | `float8` |  Nullable |
| `map_order` | `int4` |  Nullable |
| `status` | `varchar` |  Nullable |
| `published_at` | `timestamp` |  Nullable |
| `created_at` | `timestamp` |  Nullable |
| `updated_at` | `timestamp` |  Nullable |
| `deleted_at` | `timestamp` |  Nullable |

## Table `wine_subregions_backup`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` |  Nullable |
| `region_id` | `uuid` |  Nullable |
| `slug` | `varchar` |  Nullable |
| `name_fr` | `varchar` |  Nullable |
| `name_en` | `varchar` |  Nullable |
| `area_hectares` | `int4` |  Nullable |
| `description_fr` | `text` |  Nullable |
| `description_en` | `text` |  Nullable |
| `geojson` | `jsonb` |  Nullable |
| `centroid_lat` | `float8` |  Nullable |
| `centroid_lng` | `float8` |  Nullable |
| `map_order` | `int4` |  Nullable |
| `status` | `varchar` |  Nullable |
| `published_at` | `timestamp` |  Nullable |
| `created_at` | `timestamp` |  Nullable |
| `updated_at` | `timestamp` |  Nullable |
| `deleted_at` | `timestamp` |  Nullable |

