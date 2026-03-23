# Discovery Questions — Travel Workflow

These questions feed into `CLIENT_PREFERENCES` as key-value pairs. Each question has a `question_key` (used in the database), a display label in FR/EN/ES, a question type, and available options.

## Lead Qualification

### 1. planning_stage
- **FR:** Où en êtes-vous dans votre projet de voyage en Colombie ?
- **EN:** Where are you in your Colombia trip planning?
- **Type:** SINGLE_SELECT
- **Options:** `planning_early` (Just exploring), `planning_soon` (Want to book soon), `planning_ready` (Ready to book), `planning_booked_flights` (Flights already booked)
- **Impact:** Lead scoring — "ready" and "booked_flights" are hot leads

### 2. flights_booked
- **FR:** Vos vols sont déjà réservés ?
- **EN:** Are your flights already booked?
- **Type:** BOOLEAN
- **Impact:** Hot lead indicator; also determines if we need to coordinate with international flight times

### 3. budget_per_person
- **FR:** Budget approximatif par personne
- **EN:** Approximate budget per person
- **Type:** SINGLE_SELECT
- **Options:** `budget_moderate` (Hôtels simples, découverte accessible), `budget_comfort` (Hôtels de charme, bon rapport qualité-prix), `budget_premium` (Nous voulons nous faire plaisir), `budget_luxury` (Pas de limite, expérience exclusive)
- **Impact:** Tier mapping → BUDGET, STANDARD, CHARME, LUXURY

## Trip Structure

### 4. traveler_type
- **FR:** Avec qui partez-vous ?
- **EN:** Who are you traveling with?
- **Type:** SINGLE_SELECT
- **Options:** `couple`, `family`, `solo`, `friends`, `mice` (Corporate/MICE), `plus_60` (Seniors 60+), `honeymoon`
- **Impact:** Template filtering, accommodation room type, experience selection

### 5. travel_dates_known
- **FR:** Connaissez-vous les dates précises du voyage ?
- **EN:** Do you know exact travel dates?
- **Type:** BOOLEAN

### 6. travel_period
- **FR:** Quand souhaitez-vous partir ?
- **EN:** When do you want to travel?
- **Type:** TEXT (month/year or date range)
- **Impact:** Season mapping (alta/media/baja), availability checks

### 7. trip_duration
- **FR:** Durée approximative du voyage
- **EN:** Approximate trip duration
- **Type:** SINGLE_SELECT
- **Options:** `1_week` (7-9 days), `2_weeks` (10-14 days), `3_weeks` (15-21 days), `1_month` (22+ days)
- **Impact:** Template filtering by duration

### 8. travel_pace
- **FR:** Quel rythme de voyage vous plaît ?
- **EN:** What travel pace suits you?
- **Type:** SINGLE_SELECT
- **Options:** `slow` (Slow travel — few moves, deep immersion), `balanced` (Balanced — mix of discovery and rest), `intense` (Intense — see as much as possible)
- **Impact:** Template pacing, number of destinations, transport frequency

### 9. long_distances_ok
- **FR:** Vous êtes à l'aise pour faire de longues distances en voiture ?
- **EN:** Are you comfortable with long car distances?
- **Type:** SINGLE_SELECT
- **Options:** `yes_enjoy` (Yes, enjoy road trips), `moderate` (Moderate — up to 3-4 hours), `prefer_short` (Prefer short transfers or flights)
- **Impact:** Route planning — road trip templates vs. flight-heavy itineraries

## Interests & Preferences

### 10. interests
- **FR:** Lors du voyage, je m'intéresse à...
- **EN:** During the trip, I'm interested in...
- **Type:** MULTI_SELECT
- **Options:** `trekking` (Treks et activités sportives), `photography` (Paysages à photographier), `gastronomy` (Gastronomie et cuisine locale), `history_culture` (Histoire, culture et styles de vie), `wildlife` (Observation de vie sauvage et nature), `relaxation` (Nous imprégner de l'endroit et nous reposer), `nightlife` (Vie nocturne et ambiance), `coffee` (Culture du café), `diving_snorkeling` (Plongée/snorkeling), `birdwatching` (Observation d'oiseaux)
- **Impact:** Experience matching, template recommendations

### 11. activity_style
- **FR:** Pour vos excursions : actif ou contemplatif ?
- **EN:** For excursions: active or contemplative?
- **Type:** SINGLE_SELECT
- **Options:** `active` (Active — kayak, randonnée, vélo), `contemplative` (Contemplatif — catamaran, visite guidée, observation), `mixed` (Un peu des deux)
- **Impact:** Experience style matching (ExperienceStyle enum)

### 12. passions_daily
- **FR:** Quelles sont vos passions ou activités du quotidien ?
- **EN:** What are your passions or daily activities?
- **Type:** TEXT
- **Impact:** Deep personalization — surprise elements in the roadbook

### 13. children_interests
- **FR:** Les enfants ont quels hobbies ou passions ?
- **EN:** What are the children's hobbies or interests?
- **Type:** TEXT
- **Condition:** Only shown if traveler_type = "family"
- **Impact:** Family-specific activity planning, surprise elements

### 14. special_occasion
- **FR:** Une occasion à célébrer pendant le séjour ?
- **EN:** Any special occasion to celebrate during the trip?
- **Type:** TEXT (optional)
- **Options hint:** Birthday, anniversary, honeymoon, retirement, graduation...
- **Impact:** Surprise planning, special arrangements at hotels

## Accommodation Preferences

### 15. accommodation_type
- **FR:** Quel type d'hébergement aimez-vous ?
- **EN:** What type of accommodation do you prefer?
- **Type:** MULTI_SELECT
- **Options:** `boutique` (Hôtel boutique), `charme` (Hôtel de charme), `ecolodge` (Écolodge), `hacienda` (Hacienda/finca), `glamping` (Glamping), `hostel` (Auberge/hostel)
- **Impact:** Accommodation filtering by type

### 16. accommodation_standing
- **FR:** Quel standing d'hébergement recherchez-vous ?
- **EN:** What accommodation level are you looking for?
- **Type:** SINGLE_SELECT
- **Options:** `simple` (Simple et propre), `mid_range` (Confortable, bon rapport qualité-prix), `upscale` (Charme et caractère), `luxury` (Luxe, service exceptionnel)
- **Impact:** Tier mapping for accommodation selection

### 17. room_preference
- **FR:** Vous préférez une chambre lumineuse ou plutôt calme et sombre ?
- **EN:** Do you prefer a bright room or calm and dark?
- **Type:** SINGLE_SELECT
- **Options:** `bright` (Lumineuse), `calm_dark` (Calme et sombre), `no_preference` (Pas de préférence)
- **Impact:** Room assignment notes in roadbook

### 18. bed_type
- **FR:** Vous avez des préférences de type de lit ?
- **EN:** Do you have bed type preferences?
- **Type:** SINGLE_SELECT
- **Options:** `king` (King size), `twin` (Lits séparés/twin), `double` (Lit double), `child_beds` (Lits enfants nécessaires), `no_preference` (Pas de préférence)
- **Impact:** Room booking details

## Practical & Health

### 19. morning_person
- **FR:** Vous êtes plutôt lève-tôt ou lève-tard ?
- **EN:** Are you an early riser or late sleeper?
- **Type:** SINGLE_SELECT
- **Options:** `early_bird` (Lève-tôt — dès 6h c'est parti), `moderate` (Normal — 8h c'est bien), `late_riser` (Lève-tard — pas avant 9h-10h)
- **Impact:** Activity scheduling, sunrise excursions, breakfast times

### 20. dietary_restrictions
- **FR:** Des régimes alimentaires ou restrictions ?
- **EN:** Any dietary requirements or restrictions?
- **Type:** MULTI_SELECT
- **Options:** `none` (Aucune), `vegetarian` (Végétarien), `vegan` (Végan), `gluten_free` (Sans gluten), `lactose_free` (Sans lactose), `allergies` (Allergies — préciser), `halal` (Halal), `other` (Autre — préciser)
- **Impact:** Meal planning, restaurant recommendations, supplier notifications

### 21. accompaniment
- **FR:** Comment voulez-vous être accompagné ?
- **EN:** How do you want to be accompanied?
- **Type:** SINGLE_SELECT
- **Options:** `guide_driver` (Guide-chauffeur tout au long), `guide_key_days` (Guide pour les journées clés uniquement), `self_guided` (Sans accompagnement, en autonomie), `mixed` (Mix des deux)
- **Impact:** Guide booking, transport planning, pricing

### 22. trip_vision
- **FR:** Mon projet de voyage en quelques mots
- **EN:** Describe your trip vision in a few words
- **Type:** TEXT (free text, optional)
- **Impact:** Freeform input for personalization, fed to quotation notes

### 23. referral_source
- **FR:** Comment avez-vous entendu parler de nous ?
- **EN:** How did you hear about us?
- **Type:** SINGLE_SELECT
- **Options:** `agency` (Agence de voyage), `web_search` (Recherche internet), `social_media` (Réseaux sociaux), `referral` (Recommandation), `repeat` (Client fidèle), `other` (Autre)
- **Impact:** Marketing analytics, source tracking
