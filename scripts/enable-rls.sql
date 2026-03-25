-- Enable Row Level Security on all Prisma-mapped tables (see prisma/schema.prisma @@map).
-- Prisma (postgres role) bypasses RLS. PostgREST respects RLS for anon/authenticated.
-- Policies are TO service_role only so USING (true) does not open tables to public roles.

-- users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.users FOR ALL TO service_role USING (true) WITH CHECK (true);

-- destinations
ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.destinations FOR ALL TO service_role USING (true) WITH CHECK (true);

-- destination_safety
ALTER TABLE public.destination_safety ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.destination_safety FOR ALL TO service_role USING (true) WITH CHECK (true);

-- destination_tips
ALTER TABLE public.destination_tips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.destination_tips FOR ALL TO service_role USING (true) WITH CHECK (true);

-- accommodations
ALTER TABLE public.accommodations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.accommodations FOR ALL TO service_role USING (true) WITH CHECK (true);

-- experiences
ALTER TABLE public.experiences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.experiences FOR ALL TO service_role USING (true) WITH CHECK (true);

-- transport_routes
ALTER TABLE public.transport_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.transport_routes FOR ALL TO service_role USING (true) WITH CHECK (true);

-- contracts
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.contracts FOR ALL TO service_role USING (true) WITH CHECK (true);

-- trip_templates
ALTER TABLE public.trip_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.trip_templates FOR ALL TO service_role USING (true) WITH CHECK (true);

-- template_days
ALTER TABLE public.template_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.template_days FOR ALL TO service_role USING (true) WITH CHECK (true);

-- day_items
ALTER TABLE public.day_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.day_items FOR ALL TO service_role USING (true) WITH CHECK (true);

-- clients
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.clients FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ai_proposal_drafts
ALTER TABLE public.ai_proposal_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.ai_proposal_drafts FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ai_proposals
ALTER TABLE public.ai_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.ai_proposals FOR ALL TO service_role USING (true) WITH CHECK (true);

-- quote_day_details
ALTER TABLE public.quote_day_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.quote_day_details FOR ALL TO service_role USING (true) WITH CHECK (true);

-- client_operational_details
ALTER TABLE public.client_operational_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.client_operational_details FOR ALL TO service_role USING (true) WITH CHECK (true);

-- client_documents
ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.client_documents FOR ALL TO service_role USING (true) WITH CHECK (true);

-- client_flights
ALTER TABLE public.client_flights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.client_flights FOR ALL TO service_role USING (true) WITH CHECK (true);

-- intake_tokens
ALTER TABLE public.intake_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.intake_tokens FOR ALL TO service_role USING (true) WITH CHECK (true);

-- intake_responses
ALTER TABLE public.intake_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.intake_responses FOR ALL TO service_role USING (true) WITH CHECK (true);

-- email_log
ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.email_log FOR ALL TO service_role USING (true) WITH CHECK (true);

-- drip_sequences
ALTER TABLE public.drip_sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.drip_sequences FOR ALL TO service_role USING (true) WITH CHECK (true);

-- client_preferences
ALTER TABLE public.client_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.client_preferences FOR ALL TO service_role USING (true) WITH CHECK (true);

-- client_touchpoints
ALTER TABLE public.client_touchpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.client_touchpoints FOR ALL TO service_role USING (true) WITH CHECK (true);

-- quotes
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.quotes FOR ALL TO service_role USING (true) WITH CHECK (true);

-- quote_items
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.quote_items FOR ALL TO service_role USING (true) WITH CHECK (true);

-- bookings
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.bookings FOR ALL TO service_role USING (true) WITH CHECK (true);

-- booking_stages
ALTER TABLE public.booking_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.booking_stages FOR ALL TO service_role USING (true) WITH CHECK (true);

-- stage_services
ALTER TABLE public.stage_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.stage_services FOR ALL TO service_role USING (true) WITH CHECK (true);

-- supplier_orders
ALTER TABLE public.supplier_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.supplier_orders FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ops_tasks
ALTER TABLE public.ops_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.ops_tasks FOR ALL TO service_role USING (true) WITH CHECK (true);

-- payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.payments FOR ALL TO service_role USING (true) WITH CHECK (true);

-- roadbooks
ALTER TABLE public.roadbooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.roadbooks FOR ALL TO service_role USING (true) WITH CHECK (true);

-- roadbook_stages
ALTER TABLE public.roadbook_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.roadbook_stages FOR ALL TO service_role USING (true) WITH CHECK (true);

-- roadbook_tips
ALTER TABLE public.roadbook_tips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.roadbook_tips FOR ALL TO service_role USING (true) WITH CHECK (true);

-- emergency_contacts
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.emergency_contacts FOR ALL TO service_role USING (true) WITH CHECK (true);

-- feedback
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.feedback FOR ALL TO service_role USING (true) WITH CHECK (true);
