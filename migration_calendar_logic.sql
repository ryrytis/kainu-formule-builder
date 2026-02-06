-- Add Calendar Inquiry Logic Rule
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Calendar Inquiry Logic',
        'Kai vartotojas klausia apie kalendorius (sieninius, stalinius ar bendrai), PRIVALAI išvardinti turimus tipus ir paklausti, kuris domina:\n1. Pakabinamas 3 dalių (su 1 arba 3 reklaminiais plotais)\n2. Pakabinamas 1 dalies (vieno lapo)\n3. Pastatomas (stalinis)\n\nKainos priklauso nuo kiekio ir tipo.',
        'Sales Logic',
        10,
        true
    );