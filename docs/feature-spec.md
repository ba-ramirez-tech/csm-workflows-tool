# Feature Specification — Travel Workflow

## Module 1: Inventory & Contracts

### Destinations
- CRUD with multilingual descriptions (FR/EN/ES)
- Fields: name, region, altitude, climate, languages available, rental/trekking flags, GPS coordinates, photo gallery
- Linked safety information (editable per destination)
- Linked tips/recommendations (restaurants, bars, activities)

### Accommodations
- CRUD with destination filter
- Fields: name, type (hotel/ecolodge/hacienda/glamping/hostel/boutique/villa), tier, max capacity, room types (JSON), amenities, check-in/out times, contact info, photo gallery, star rating, internal rating
- Availability calendar (future: block dates)
- Room type sub-form: name, max guests, bed type, description

### Experiences
- CRUD with destination and category filters
- Fields: name, category, activity style (active/contemplative/cultural/gastronomic/nature/adventure/relaxation), duration, difficulty level, languages, transport included, min/max pax, meeting point, contact info, included/not-included lists, what to bring, photo gallery
- Multi-language descriptions and highlights

### Transport Routes
- CRUD connecting two destinations
- Fields: origin, destination, mode, provider, vehicle type, capacity, distance km, duration minutes, altitude start/end, route notes, contact info
- Visual: origin → destination with mode icon

### Contracts (Super Admin Only)
- Link to any supplier (accommodation, experience, or transport)
- Fields: net cost COP, cost-per-what (night/person/group/vehicle), season, validity dates, negotiated perks, conditions, commission
- List view grouped by supplier with cost summaries
- Role-gated: only SUPER_ADMIN can view/edit

## Module 2: Templates & Pricing

### Trip Templates
- Metadata: name, slug, traveler types, tier, duration, base price, description, highlights, included/not-included, what to bring
- Day-by-day builder: each day has a destination + ordered list of items
- Day items reference real entities (accommodation, experience, transport) or generic entries (meal, free_time)
- Visual timeline preview
- Clone template functionality for variations
- Publish/unpublish toggle

## Module 3: CRM & Discovery

### Client Profiles
- Fields: name, email, phone, language, nationality, traveler type, tier, lead status, source, agency name, notes
- Lead pipeline: kanban view (New → Contacted → Discovery Done → Quoted → Negotiating → Won/Lost)
- Activity timeline: all interactions, quotes, bookings

### Discovery Questionnaire
- Step-by-step wizard with 23 questions (see discovery-questions.md)
- Saves answers as key-value pairs in ClientPreference table
- Can be filled by agent during call or sent as link to client (future)
- Answers influence template recommendations and quotation

### Quotation Engine
- Start from template or blank
- Select client, set duration, traveler count, tier
- Day-by-day editor: swap accommodations, add/remove experiences, change transport
- Auto-calculate price from contract costs + configurable margin
- Status workflow: draft → sent → accepted → booking / rejected
- Export as PDF with branding
- Version history (optional)

### Interactions
- Log calls, emails, WhatsApp messages, meetings, internal notes
- Linked to client profile
- Timestamped activity feed

## Module 4: Bookings & Operations

### Dossier Management
- Auto-generated dossier number (CSM-YYYY-NNNN)
- Status: draft → confirmed → in_progress → completed → cancelled
- Linked: client, quote, operative, stages, supplier orders, tasks, roadbook, payments, emergency contacts, feedback

### Booking Stages (Étapes)
- Generated from quote when booking is created
- Each stage: destination, dates, ordered services
- Services: accommodation (with reservation ref), experience (with guide contact), transport (with driver contact), flights, meals
- Each service has confirmation status: pending → requested → confirmed → paid

### Supplier Orders
- Track every supplier booking: hotel reservations, guide bookings, transport arrangements, flight tickets
- Status tracking with confirmation references
- Payment tracking per supplier (cost, paid amount, invoice number)
- Booking sequence logic: flights first → hotels & guides → transport

### Operations Calendar
- Gantt-style timeline view of all active bookings
- Color-coded by status
- Shows: which clients are traveling today, arriving tomorrow, departing this week
- Filter by operative, destination, date range

### Daily Ops Dashboard
- Today's tasks: client check-ins, supplier confirmations, follow-ups
- Today's travelers: which clients are on the road, where they are, what services are scheduled
- Tomorrow's prep: confirmations to send, guides to remind
- Next week's dossiers: booking confirmations to finalize
- Overdue tasks alert

### Ops Tasks (Auto-generated)
When a booking is confirmed, auto-create tasks:
- T-30 days: Book flights
- T-21 days: Send hotel reservation requests
- T-14 days: Confirm guides and experiences
- T-7 days: Confirm transport, send booking confirmation to client
- T-3 days: Generate and send roadbook
- Travel Day N: Daily check-in with client
- Travel Day N: Confirm next day's supplier services
- T+1 day after return: Send feedback request

## Module 5: Roadbook / Carnet de Voyage
See `/docs/roadbook-spec.md` for full specification.

### Internal (Admin)
- Auto-generate from booking stages
- Pull destination safety, tips, and restaurant recommendations
- Edit each section before publishing
- Preview in client-facing format
- Publish → generates share token URL

### External (Client-facing)
- Public URL: `/roadbook/[token]`
- No auth required
- Mobile-responsive, premium design
- All sections from roadbook spec
- Multilingual (rendered in client's language)

## Module 6: Client Trip Builder (Future Phase)
- Public-facing visual configurator
- Map-based interface: Colombia map that highlights destinations as client selects them
- Step-by-step wizard: dates → interests → pace → destinations → accommodations → experiences
- Real-time budget indicator
- Uses discovery questions as input
- Funnels to: book a call / book a trip
- Multilingual (FR/EN/ES/DE)
- Pulls from inventory database for live options

## Cross-Cutting Features

### Dashboard
- Overview metrics: active bookings, pipeline value, conversion rate, upcoming departures
- Quick actions: new client, new quote, today's tasks

### Search
- Global search across clients, bookings, hotels, experiences, destinations

### Settings
- Company branding (logo, colors)
- Email templates
- Task automation rules
- User management (roles, permissions)
- Currency exchange rates
- Notification preferences
