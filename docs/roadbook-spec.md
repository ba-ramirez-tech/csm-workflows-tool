# Roadbook Specification — Travel Workflow

Based on analysis of the real 53-page "Votre Carnet de Voyage" produced by Altiplano Voyage / Colombia Memories.

## Overview
The roadbook is a shareable, mobile-responsive web page that serves as the traveler's complete trip companion. It is generated from a confirmed booking and published via a unique share token URL: `/roadbook/[token]`.

## Sections (in order)

### 1. Cover
- Trip title: "Votre voyage en Colombie"
- Client name(s)
- Dates: start to end
- Duration: X jours / Y nuits
- Hero image (destination-specific)

### 2. Trip Summary
- Visual itinerary overview: list of days with destination and key activity
- Example: Jour 1: Arrivée à Medellín | Jour 2: Medellín — Guatapé | Jour 3: Medellín — Salento...
- Map showing route between destinations (optional, future enhancement)

### 3. Flight Details
- All flights with: airline, flight number, departure/arrival times, terminals, booking reference
- Baggage allowance info
- Check-in reminder

### 4. Day-by-Day Stages (étapes)
For each day/stage:
- **Date and day number**
- **Destination name** with brief description
- **Scheduled services** with times:
  - Transport: meeting time, pickup location, driver name/phone, duration, distance
  - Activities: meeting time/point, guide name/phone, duration, what's included
  - Meals: which meals are included, free meals with restaurant suggestions
- **Accommodation**: hotel name, address, phone, website, reservation code, check-in/out times, room type, amenities, brief description
- **Free time suggestions**: linked to Destination Tips for that city
- **Climate note**: expected temperature range, what to wear

### 5. Accommodation Summary
- Table of all hotels across the trip: dates, city, hotel name, stars, website, climate
- Photo of each hotel (if available)

### 6. Transport Summary
- Table of all transfers: day, origin, destination, mode, approximate duration
- Notes about road conditions, altitude changes

### 7. Restaurant & Café Recommendations (per destination)
Grouped by city, each entry includes:
- Name
- Cuisine type
- Price range (in COP and EUR equivalent)
- Opening hours
- Address
- Brief description
- Tags: vegetarian, local, rooftop, etc.

Source: DESTINATION_TIPS table filtered by category (restaurant, cafe, bar)

### 8. Mapped Tips per Destination
For each city in the itinerary, show a curated map with:
- Recommended places: restaurants, bars, markets, viewpoints, museums, parks
- Category color coding
- Walking distance indicator from hotel
- Free activities and local experiences

Source: DESTINATION_TIPS table with GPS coordinates

### 9. Safety & Health Information
**General Colombia info:**
- Visa/passport requirements (6 months validity)
- Check-Mig immigration form instructions
- Emergency numbers: Police 123, Fire 119, Medical 125
- French Embassy contact (for French clients)

**Per-destination safety highlights:**
- Altitude warnings (Bogotá at 2600m)
- Mosquito/insect precautions (tropical regions)
- Water safety
- Sun/UV protection (especially Medellín area)
- General street safety tips

Source: DESTINATION_SAFETY table

### 10. Emergency Contacts
- Local 24/7 francophone emergency line (company number)
- Agency contact in origin country (for flight issues)
- Client's personal emergency contacts (from EMERGENCY_CONTACTS table)
- Insurance company details (if provided)

### 11. Practical Information
- **Money:** Currency info, ATM guidance, tipping customs (5-10% restaurants, 1.5-2 EUR/day/person for drivers, double for guides)
- **Phone/Internet:** SIM card info, WhatsApp recommendation, WiFi availability
- **Driving:** International permit info (valid 90 days for tourists)
- **Time zone:** UTC-5 (Colombia does not observe daylight saving)

### 12. Packing List
Categorized checklist:
- Documents: passport, copy, tickets, insurance, emergency numbers
- Money: cards, local currency
- Toiletries: sunscreen, insect repellent, anti-itch cream, medications
- Accessories: binoculars, camera, charger, flashlight, power adapter (Type A)
- Clothing: varies by itinerary destinations and activities

Source: Base template + customized based on itinerary (trekking gear if trek included, swim gear if beach, warm layers if highlands)

### 13. Notes Section
Blank space for traveler's own notes

## Technical Requirements
- Mobile-first responsive design
- Works offline (PWA consideration for future)
- Print-friendly CSS for clients who want paper copies
- Multilingual: render in client's preferred language (fr/en/es/de)
- No authentication required — accessed via unique share token
- Beautiful typography, generous whitespace, premium travel aesthetic
- Images load lazily for performance
- Each section has anchor links from a sticky table of contents
