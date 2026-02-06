-- 1. Update Sticker Prices (Sheets 2.00 -> 1.65 + VAT?)
-- User said: "from 1,65+PVM"
-- Current DB has: "Lipdukas ant popieriaus" -> 2.0000 EUR
-- We update them to be descriptive about "Sheets" and correct base price.
UPDATE public.ai_knowledge
SET content = 'We offer Paper Stickers (Lipdukai ant popieriaus). Base price starts at 1.65 EUR + VAT per A3 sheet.'
WHERE topic = 'Lipdukas ant popieriaus';
UPDATE public.ai_knowledge
SET content = 'We offer Film Stickers (Lipdukai ant plėvelės). Base price starts at 1.65 EUR + VAT per A3 sheet.'
WHERE topic = 'Lipdukas ant plėvelės';
-- 2. Add Sticker Inquiry Logic Rule (Meta-Knowledge)
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Sticker Inquiry Logic',
        'When a user asks about sticker prices (Lipdukai), you MUST first ask: "Do you need them in sheets (lapais) or rolls (rulonais)?". \n- IF Sheets: Quote the price starting from 1.65 EUR + VAT per A3 sheet.\n- IF Rolls: State that price depends on design, colors, size, and quantity, and ASK for these details.',
        'Sales Logic',
        10,
        true
    );