-- Third Batch of Product FAQ Knowledge Base Entries
-- Created: 2026-02-08
-- 32 Additional Questions and Answers
-- ============================================
-- TROUBLESHOOTING & COMMON ISSUES (5 entries)
-- ============================================
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'File Too Small Issues',
        'Klausimas: Kodėl mano failas per mažas/netinkamas?\nAtsakymas: Failas gali būti per mažos raiškos (mažiau nei 300 DPI) arba per mažų matmenų. Patikrinkite, ar failas atitinka užsakyto produkto dydį su 3mm bleed.',
        'Product FAQ - Troubleshooting',
        17,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Black Looks Gray',
        'Klausimas: Kodėl juoda spalva atrodo pilka spaudoje?\nAtsakymas: Naudokite „rich black" (C60 M40 Y40 K100) vietoj gryno juodo (K100). Grynas juodas gali atrodyti pilšvas, ypač dideliuose plotuose.',
        'Product FAQ - Troubleshooting',
        17,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Text Too Close to Edge',
        'Klausimas: Kodėl dalis teksto nukirstas?\nAtsakymas: Tekstas buvo per arti lapo krašto. Visada palikite 3-5mm saugią zoną nuo krašto. Pjovimo metu gali būti nedidelis poslinkis.',
        'Product FAQ - Troubleshooting',
        17,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Colors Look Different',
        'Klausimas: Kodėl spalvos skiriasi nuo to, ką matau ekrane?\nAtsakymas: Ekranai naudoja RGB, o spauda – CMYK. Kai kurios ryškios RGB spalvos (ypač neoninės) negali būti tiksliai atspausdintos. Rekomenduojame užsakyti proof.',
        'Product FAQ - Troubleshooting',
        17,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Fonts Changed',
        'Klausimas: Kodėl šriftas pakeistas/iškraipytas?\nAtsakymas: Šriftas nebuvo įterptas (embedded) į PDF. Konvertuokite šriftus į kreives (outlines) arba įterpkite į PDF prieš siunčiant.',
        'Product FAQ - Troubleshooting',
        17,
        true
    );
-- ============================================
-- SPECIFIC MATERIALS (5 entries)
-- ============================================
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Kraft Paper',
        'Klausimas: Ar turite kraft popieriaus?\nAtsakymas: Taip, siūlome rudą kraft popierių natūralios išvaizdos spaudiniams. Puikiai tinka eko stiliaus etiketėms, dėžutėms, paketams.',
        'Product FAQ - Materials',
        16,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Textured Paper',
        'Klausimas: Ar turite tekstūruoto popieriaus?\nAtsakymas: Taip, siūlome lino, vilnos, drobės tekstūros popierių. Populiarus vizitinėms ir kvietimams – suteikia premium pojūtį.',
        'Product FAQ - Materials',
        16,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Metallic Paper',
        'Klausimas: Ar turite metalizuoto popieriaus?\nAtsakymas: Taip, siūlome sidabrinį ir auksinį metalizuotą popierių. Pati medžiaga blizga – papildomas folijavimas nebūtinas.',
        'Product FAQ - Materials',
        16,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Transparent Sticker Material',
        'Klausimas: Ar turite skaidrių lipdukų?\nAtsakymas: Taip, siūlome skaidrią (transparent) plėvelę lipdukams. Lipduko fonas bus permatomas – matysis tik dizainas.',
        'Product FAQ - Materials',
        16,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Waterproof Materials',
        'Klausimas: Kokios medžiagos atsparios vandeniui?\nAtsakymas: Lipdukai ant plėvelės, sintetinis popierius, PVC baneriai. Šios medžiagos tinka lauko sąlygoms ir drėgnoms aplinkoms.',
        'Product FAQ - Materials',
        16,
        true
    );
-- ============================================
-- DESIGN SERVICES (5 entries)
-- ============================================
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Design from Scratch',
        'Klausimas: Ar galite sukurti dizainą nuo nulio?\nAtsakymas: Taip, turime dizainerius. Kaina priklauso nuo produkto sudėtingumo (vizitinės ~15-25 EUR, lankstinukas ~40-80 EUR, katalogas – individualiai).',
        'Product FAQ - Design',
        16,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Logo Design',
        'Klausimas: Ar kuriate logotipus?\nAtsakymas: Siūlome paprastą logotipo kūrimą arba galime rekomenduoti profesionalų dizainerį. Paprastas logotipas – nuo 50-100 EUR.',
        'Product FAQ - Design',
        16,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Template Customization',
        'Klausimas: Ar galite pritaikyti esamą šabloną?\nAtsakymas: Taip, galime pakeisti tekstą, spalvas, logotipą esamame makete. Paprastų pakeitimų kaina – 10-25 EUR.',
        'Product FAQ - Design',
        16,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Design Revision Rounds',
        'Klausimas: Kiek taisymų įskaičiuota į dizaino kainą?\nAtsakymas: Paprastai – 2 taisymų raundai. Papildomi taisymai – nuo 10 EUR/valanda.',
        'Product FAQ - Design',
        16,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Design Ownership',
        'Klausimas: Ar gausiu originalius dizaino failus?\nAtsakymas: Taip, po projekto pabaigos gausite originalius failus (AI, PDF). Jūs tampate dizaino savininku.',
        'Product FAQ - Design',
        16,
        true
    );
-- ============================================
-- SPECIFIC PRODUCTS (6 entries)
-- ============================================
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Tickets Printing',
        'Klausimas: Ar spausdinate bilietus?\nAtsakymas: Taip, gaminame renginių bilietus su numeravimu, perforacija ir/arba QR kodais. Galime spausdinti ant apsauginio popieriaus.',
        'Product FAQ - Products',
        15,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Certificates Printing',
        'Klausimas: Ar spausdinate sertifikatus/diplomus?\nAtsakymas: Taip, gaminame sertifikatus, diplomus, pažymėjimus. Siūlome storesnį popierių (250-300g) ir galimybę folijavimui.',
        'Product FAQ - Products',
        15,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Menu Printing',
        'Klausimas: Ar spausdinate meniu kortelių restoranas?\nAtsakymas: Taip, gaminame meniu kortelių su laminavimu (lengva valyti). Formatai: A4, A5, DL, trifold. Taip pat stalinius stovus.',
        'Product FAQ - Products',
        15,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Door Hangers',
        'Klausimas: Ar gaminate durų pakabukus (door hangers)?\nAtsakymas: Taip, gaminame durų pakabukus su išpjova rankenai. Populiaru viešbučiams ir reklamai.',
        'Product FAQ - Products',
        15,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Coasters Printing',
        'Klausimas: Ar gaminate padėklus (coasters)?\nAtsakymas: Taip, gaminame kartonines padėkles gėrimams. Apvalias arba kvadratines, su jūsų logotipu ar dizainu.',
        'Product FAQ - Products',
        15,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Table Tents',
        'Klausimas: Ar gaminate stalo stovus/pastatymus?\nAtsakymas: Taip, gaminame trikampius ir A tipo stalo pastatymus (table tents) meniu, reklamai ar informacijai pateikti.',
        'Product FAQ - Products',
        15,
        true
    );
-- ============================================
-- B2B & BULK ORDERS (4 entries)
-- ============================================
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Reseller Program',
        'Klausimas: Ar turite nuolaidas perpardavinėtojams?\nAtsakymas: Taip, siūlome specialias kainas nuolatiniams B2B klientams ir reklamos agentūroms. Susisiekite dėl partnerystės sąlygų.',
        'Product FAQ - B2B',
        16,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Regular Orders Contract',
        'Klausimas: Ar galime sudaryti ilgalaikę sutartį reguliariems užsakymams?\nAtsakymas: Taip, siūlome sutartis su fiksuotomis kainomis reguliariems klientams. Tai garantuoja kainų stabilumą.',
        'Product FAQ - B2B',
        16,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'White Label Printing',
        'Klausimas: Ar siūlote white label spaudos paslaugas?\nAtsakymas: Taip, galime gaminti produkciją jūsų prekės ženklu be mūsų logotipo. Populiaru reklamos agentūroms.',
        'Product FAQ - B2B',
        16,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Bulk Shipping',
        'Klausimas: Ar galite išsiųsti užsakymą į kelis adresus?\nAtsakymas: Taip, galime padalinti tiražą ir išsiųsti į skirtingus adresus Lietuvoje. Siuntimo kaina skaičiuojama kiekvienam adresui.',
        'Product FAQ - B2B',
        16,
        true
    );
-- ============================================
-- SEASONAL & SPECIAL (4 entries)
-- ============================================
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Christmas Cards',
        'Klausimas: Ar gaminate kalėdinius atvirukus?\nAtsakymas: Taip, gaminame firminius kalėdinius atvirukus su jūsų logotipu ir sveikinimo tekstu. Rekomenduojame užsakyti lapkričio pradžioje.',
        'Product FAQ - Seasonal',
        15,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'New Year Calendars',
        'Klausimas: Kada geriausia užsakyti kalendorius naujiems metams?\nAtsakymas: Optimalus laikas – spalio-lapkričio mėn. Gruodžio pradžioje vis dar įmanoma, bet rekomenduojame planuoti iš anksto.',
        'Product FAQ - Seasonal',
        15,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Event Materials Rush',
        'Klausimas: Ar galite pagaminti skubiai renginiui?\nAtsakymas: Taip, siūlome skubų režimą per 24-48 val. su papildomu mokesčiu. Rekomenduojame planuoti bent 5-7 d.d. prieš renginį.',
        'Product FAQ - Seasonal',
        15,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Trade Show Materials',
        'Klausimas: Ką rekomenduojate parodai/mugei?\nAtsakymas: Vizitinės, skrajutės, lankstinukai, roll-up stendai, aplankai su kišene, produktų katalogai. Galime paruošti pilną paketą.',
        'Product FAQ - Seasonal',
        15,
        true
    );
-- ============================================
-- SUSTAINABILITY (3 entries)
-- ============================================
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'FSC Certification',
        'Klausimas: Ar naudojate FSC sertifikuotą popierių?\nAtsakymas: Taip, galime naudoti FSC sertifikuotą popierių. Tai garantuoja, kad popierius iš atsakingai tvarkomų miškų.',
        'Product FAQ - Sustainability',
        15,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Plastic Free Options',
        'Klausimas: Ar turite pakuočių be plastiko?\nAtsakymas: Taip, galime pagaminti dėžutes be plastikinio laminavimo ar langelio. Vietoj PVC langelio galima naudoti celiuliozės plėvelę.',
        'Product FAQ - Sustainability',
        15,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Waste Reduction',
        'Klausimas: Kaip mažinate atliekas gamyboje?\nAtsakymas: Optimizuojame maketo išdėstymą lape, perdirbame popieriaus liekanas, naudojame ekologiškus dažus. Siekiame mažinti aplinkos pėdsaką.',
        'Product FAQ - Sustainability',
        15,
        true
    );