-- 1. Add Design Inquiry Logic Rule
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Design Inquiry Logic',
        'When a user asks for a quote for ANY printing product (flyers, business cards, etc.), you MUST ask: "Do you have a print-ready design file (maketas)?". \n- IF YES: Ask them to send it for checking.\n- IF NO: Explain design options:\n  * Small Adjustments (Smulkūs pataisymai): ~10-25 EUR (depends on complexity).\n  * New Design (Naujas maketas): Price depends on the product (e.g., ~15-25 EUR for business cards, ~40+ EUR for brochures/flyers).',
        'Sales Logic',
        10,
        true
    );
-- 2. Update "Maketavimas" Price (Small Adjustments)
-- Check if exists, update logic to be more descriptive
UPDATE public.ai_knowledge
SET content = 'We offer Layout/Adjustment Services (Maketavimas). Price differs:\n- Small Adjustments: 10-25 EUR.\n- Full Layout: Starts at 25 EUR.',
    priority = 5
WHERE topic = 'Maketavimas';
-- 3. Update "Dizainas" Price (New Design)
UPDATE public.ai_knowledge
SET content = 'We offer Design Services (Dizainas). Price differs by product:\n- Business Cards: ~15-25 EUR\n- Flyers/Posters: ~40-60 EUR\n- Multi-page: Custom quote.',
    priority = 5
WHERE topic = 'Dizainas';