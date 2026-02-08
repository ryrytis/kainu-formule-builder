-- Comprehensive Product FAQ Knowledge Base Entries
-- Created: 2026-02-08
-- 40+ Questions and Answers covering products, post-processing, and cutting
-- ============================================
-- DELIVERY & TIMING (5 entries)
-- ============================================
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Production Lead Time',
        'Klausimas: Per kiek laiko įvykdote užsakymą?\nAtsakymas: Standartinis gamybos laikas 3-5 darbo dienos. Skubūs užsakymai galimi per 1-2 d.d. su papildomu mokesčiu.',
        'Product FAQ - Delivery',
        15,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Pickup Option',
        'Klausimas: Ar galiu atsiimti užsakymą pats?\nAtsakymas: Taip, galite atsiimti mūsų biure darbo valandomis (I-V, 9:00-18:00).',
        'Product FAQ - Delivery',
        15,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Express Orders',
        'Klausimas: Ar galite pagaminti skubiai?\nAtsakymas: Taip, siūlome skubų gamybos režimą per 24-48 val. Taikomas 30-50% papildomas mokestis, priklausomai nuo produkto.',
        'Product FAQ - Delivery',
        15,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Delivery Areas',
        'Klausimas: Ar pristatote visoje Lietuvoje?\nAtsakymas: Taip, siunčiame per paštomatus (nuo 1.80 EUR) arba kurjeriu (nuo 5 EUR) į bet kurį Lietuvos miestą.',
        'Product FAQ - Delivery',
        15,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'International Shipping',
        'Klausimas: Ar siunčiate į užsienį?\nAtsakymas: Taip, siunčiame į ES šalis. Siuntimo kaina priklauso nuo svorio ir paskirties šalies. Susisiekite dėl tikslios kainos.',
        'Product FAQ - Delivery',
        15,
        true
    );
-- ============================================
-- FILE PREPARATION (6 entries)
-- ============================================
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Accepted File Formats',
        'Klausimas: Kokių formatų failus priimate?\nAtsakymas: PDF (rekomenduojama), AI, EPS, TIFF (300 dpi). JPG tinka, bet rekomenduojame PDF su 3mm užlaidomis (bleed).',
        'Product FAQ - Files',
        16,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Bleed Explanation',
        'Klausimas: Kas yra „bleed" (užlaidos)?\nAtsakymas: Tai 3mm papildoma zona nuo maketo krašto. Būtina, kad spauda siektų iki pat lapo krašto po pjovimo. Be užlaidų gali likti baltas kraštas.',
        'Product FAQ - Files',
        16,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Resolution Requirements',
        'Klausimas: Kokia turi būti failo raiška (DPI)?\nAtsakymas: Minimaliai 300 DPI spaudai. Mažesnė raiška = neryškus, pikselizuotas rezultatas. Plakatams 150-200 DPI gali pakakti.',
        'Product FAQ - Files',
        16,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Color Mode CMYK',
        'Klausimas: Kokį spalvų režimą naudoti?\nAtsakymas: CMYK – tai spaudos standartas. RGB failai bus konvertuoti, bet spalvos gali šiek tiek skirtis nuo ekrano.',
        'Product FAQ - Files',
        16,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Safe Zone',
        'Klausimas: Kas yra „safe zone" (saugi zona)?\nAtsakymas: Tai 3-5mm zona nuo maketo krašto, kurioje neturėtų būti svarbaus teksto ar logotipų, nes pjovimo metu gali būti nukertama.',
        'Product FAQ - Files',
        16,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Font Embedding',
        'Klausimas: Kaip paruošti šriftus spaudai?\nAtsakymas: Šriftai turi būti įterpti (embedded) į PDF arba konvertuoti į kreives (outlines). Kitaip šriftas gali būti pakeistas.',
        'Product FAQ - Files',
        16,
        true
    );
-- ============================================
-- PAYMENT & INVOICING (4 entries)
-- ============================================
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Payment Methods',
        'Klausimas: Kokie mokėjimo būdai galimi?\nAtsakymas: Bankinis pavedimas, kortelės mokėjimas. Nuolatiniams klientams galimas mokėjimas pagal sąskaitą po pristatymo.',
        'Product FAQ - Payment',
        15,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Prepayment Policy',
        'Klausimas: Ar reikia apmokėti iš anksto?\nAtsakymas: Naujiems klientams ir dideliems užsakymams taikomas 50-100% išankstinis apmokėjimas. Nuolatiniams – pagal susitarimą.',
        'Product FAQ - Payment',
        15,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Invoice Terms',
        'Klausimas: Per kiek laiko reikia apmokėti sąskaitą?\nAtsakymas: Standartinis mokėjimo terminas – 14 dienų nuo sąskaitos išrašymo datos.',
        'Product FAQ - Payment',
        15,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'VAT Included',
        'Klausimas: Ar kainos nurodytos su PVM?\nAtsakymas: Visos kainos internete ir pasiūlymuose nurodomos be PVM. Galutinė suma bus su 21% PVM.',
        'Product FAQ - Payment',
        15,
        true
    );
-- ============================================
-- BOOKLETS & BROCHURES (5 entries)
-- ============================================
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Booklet Page Count',
        'Klausimas: Kiek puslapių gali turėti bukletas?\nAtsakymas: Bukletai segami kabėmis – 8-48 psl. (puslapių skaičius turi dalytis iš 4). Spiralė – praktiškai neribotai.',
        'Product FAQ - Booklets',
        15,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Booklet Cover vs Inner Paper',
        'Klausimas: Ar galiu pasirinkti skirtingą popierių viršeliui?\nAtsakymas: Taip, dažnai viršelis storesnis (250-350g), o vidiniai puslapiai – 130-170g kreidinis.',
        'Product FAQ - Booklets',
        15,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Binding Options',
        'Klausimas: Kokius įrišimo būdus siūlote?\nAtsakymas: Segimas kabėmis (saddle stitch), spiralinis įrišimas, klijinis įrišimas (perfect binding). Pasirinkimas priklauso nuo puslapių skaičiaus.',
        'Product FAQ - Booklets',
        15,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Catalog Printing',
        'Klausimas: Ar gaminate katalogus?\nAtsakymas: Taip, gaminame įvairaus puslapių skaičiaus katalogus su skirtingais įrišimo būdais. Rekomenduojame atsiųsti specifikaciją pasiūlymui.',
        'Product FAQ - Booklets',
        15,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Magazine Printing',
        'Klausimas: Ar spausdinate žurnalus?\nAtsakymas: Taip, siūlome pilną žurnalų spaudos paslaugą – nuo maketavimo iki įrišimo. Susisiekite dėl individualaus pasiūlymo.',
        'Product FAQ - Booklets',
        15,
        true
    );
-- ============================================
-- PROOFING & APPROVAL (3 entries)
-- ============================================
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Digital Proof',
        'Klausimas: Ar galėsiu pamatyti maketą prieš spaudą?\nAtsakymas: Taip, siunčiame PDF proof peržiūrai. Po jūsų patvirtinimo pradedame gamybą. Tai nemokama paslauga.',
        'Product FAQ - Proofing',
        15,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Printed Proof',
        'Klausimas: Ar galiu gauti atspausdintą bandymą?\nAtsakymas: Taip, siūlome spausdintą proof už papildomą mokestį. Tai patartina spalvų tikslumui patikrinti prieš didelį tiražą.',
        'Product FAQ - Proofing',
        15,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Approval Process',
        'Klausimas: Kaip vyksta maketo patvirtinimas?\nAtsakymas: Gauname maketą → patikriname techninius parametrus → siunčiame proof → laukiame jūsų patvirtinimo → pradedame gamybą.',
        'Product FAQ - Proofing',
        15,
        true
    );
-- ============================================
-- ECO OPTIONS (3 entries)
-- ============================================
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Recycled Paper',
        'Klausimas: Ar turite ekologiško popieriaus?\nAtsakymas: Taip, siūlome perdirbtą popierių ir FSC sertifikuotas medžiagas. Spalvos gali atrodyti šiek tiek natūraliau.',
        'Product FAQ - Eco',
        15,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Eco Inks',
        'Klausimas: Kokius dažus naudojate?\nAtsakymas: Naudojame UV ir lateksinius dažus, kurie yra mažiau kenksmingi aplinkai nei tradiciniai tirpikliniai dažai.',
        'Product FAQ - Eco',
        15,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Biodegradable Options',
        'Klausimas: Ar yra biologiškai skaidžių pakuočių?\nAtsakymas: Taip, galime pasiūlyti kartonines dėžutes be laminavimo, kurios lengvai perdirbamos. Plėvelinis laminavimas apsunkina perdirbimą.',
        'Product FAQ - Eco',
        15,
        true
    );
-- ============================================
-- POST-PROCESSING / FINISHING (8 entries)
-- ============================================
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Embossing',
        'Klausimas: Kas yra kongrevo spauda (embossing)?\nAtsakymas: Tai reljefinis įspaudimas, kuris sukuria iškilų (arba įdubusį) vaizdą popieriuje. Puikiai tinka logotipams ir vizitinėms.',
        'Product FAQ - Finishing',
        18,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Die Cutting',
        'Klausimas: Kas yra štancavimas (die-cutting)?\nAtsakymas: Tai specialios formos išpjovimas – galime pagaminti bet kokios formos korteles, lipdukus, dėžutes. Reikalingas individualus pjovimo įrankis.',
        'Product FAQ - Finishing',
        18,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Perforating',
        'Klausimas: Kas yra perforacija?\nAtsakymas: Tai punktyrinė linija, leidžianti lengvai nuplėšti dalį (pvz., kuponą, bilieto šaknelę). Dažnai naudojama bilietams ir čekiams.',
        'Product FAQ - Finishing',
        18,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Scoring/Creasing',
        'Klausimas: Kas yra bigavimas?\nAtsakymas: Tai linijos įspaudimas popieriuje, kad būtų lengviau ir tiksliau sulenkti. Būtina storesniam popieriui (nuo 200g) – kitaip popierius gali įtrūkti.',
        'Product FAQ - Finishing',
        18,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Rounded Corners',
        'Klausimas: Ar galite suapvalinti kampus?\nAtsakymas: Taip, siūlome suapvalintus kampus vizitinėms, kortelėms ir lipdukams. Tai suteikia modernesnę išvaizdą.',
        'Product FAQ - Finishing',
        18,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Spot Gloss vs Matte',
        'Klausimas: Kuo skiriasi blizgus ir matinis laminavimas?\nAtsakymas: Blizgus – ryškesnės spalvos, atspindintis paviršius. Matinis – solidesnis, be atspindžių, geriau jaučiasi rankose.',
        'Product FAQ - Finishing',
        18,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Numbering',
        'Klausimas: Ar galite sunumeruoti spaudinius?\nAtsakymas: Taip, siūlome numeravimą bilietams, kuponams, čekiams. Kiekvienas egzempliorius gaus unikalų numerį.',
        'Product FAQ - Finishing',
        18,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Varnish Types',
        'Klausimas: Kokie lakavimo būdai galimi?\nAtsakymas: Pilnas UV lakas (blizgus arba matinis), selektyvus 3D UV lakas (tik pasirinktose vietose), dispersionis lakas (pigesnis variantas).',
        'Product FAQ - Finishing',
        18,
        true
    );
-- ============================================
-- BOXES & PACKAGING CUTTING (6 entries)
-- ============================================
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Box Die Cutting Tool',
        'Klausimas: Ar man reikia savo pjovimo įrankio dėžutėms?\nAtsakymas: Jei naudojate standartinę formą – turime gatavus įrankius. Individualiems dydžiams sukuriame naują štancą (formą) už papildomą mokestį.',
        'Product FAQ - Boxes',
        18,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Box Prototype',
        'Klausimas: Ar galite pagaminti dėžutės prototipą?\nAtsakymas: Taip, prieš didelį tiražą galime pagaminti 1-3 prototipus patvirtinimui. Tai padeda išvengti klaidų.',
        'Product FAQ - Boxes',
        18,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Box Assembly',
        'Klausimas: Ar dėžutės pristatytos jau surinktos?\nAtsakymas: Priklauso nuo tipo. Klijuojamos dėžutės pristatomos plokščios (sutaupoma vietos). Greito uždarymo – gali būti iš dalies surinktos.',
        'Product FAQ - Boxes',
        18,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Box Minimum Quantity',
        'Klausimas: Koks minimalus dėžučių užsakymas?\nAtsakymas: Standartinėms formoms – nuo 50 vnt. Individualioms – nuo 100-200 vnt. dėl štancos gamybos kaštų.',
        'Product FAQ - Boxes',
        18,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Box Types Explained',
        'Klausimas: Kokius dėžučių tipus gaminate?\nAtsakymas: Klijuojamos, su dangteliu, greito uždarymo (auto-bottom), įmautės, stalčiukinio tipo. Pasirinkimas priklauso nuo prekės ir naudojimo.',
        'Product FAQ - Boxes',
        18,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Heavy Product Boxes',
        'Klausimas: Kokį kartoną rinktis sunkiems gaminiams?\nAtsakymas: Sunkiems gaminiams rekomenduojame 400-450g kartoną arba gofruotą kartoną (dviejų sluoksnių), kuris yra tvirtesnis.',
        'Product FAQ - Boxes',
        18,
        true
    );
-- ============================================
-- KARULIS / HANG TAGS (5 entries)
-- ============================================
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Karulis Quantity',
        'Klausimas: Koks minimalus karulių (hang tag) užsakymas?\nAtsakymas: Minimalus kiekis – tiek, kiek telpa į vieną A3 lakštą. Pvz., 90x50mm karulių – apie 40 vnt. Kaina priklauso nuo kiekio lape.',
        'Product FAQ - Karulis',
        18,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Karulis Hole',
        'Klausimas: Ar galite išmušti skylutę karuliuose?\nAtsakymas: Taip, skylutė virvelei ar kabliukui – standartinė paslauga. Galime padaryti apvalią 3-5mm skylutę pasirinktoje vietoje.',
        'Product FAQ - Karulis',
        18,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Karulis Shapes',
        'Klausimas: Ar karuliai gali būti nestandartinės formos?\nAtsakymas: Taip, galime išpjauti bet kokią formą – apvalią, su suapvalintais kampais, figūrinę. Reikalingas štancavimo įrankis.',
        'Product FAQ - Karulis',
        18,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Karulis Paper Weight',
        'Klausimas: Kokio storio popierių rinktis karuliams?\nAtsakymas: Rekomenduojame 300-350g kartoną – pakankamai storas, kad laikytų formą ir atrodytų kokybiškai.',
        'Product FAQ - Karulis',
        18,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Karulis String',
        'Klausimas: Ar galite pridėti virvutę prie karulių?\nAtsakymas: Taip, galime pridėti įvairias virvutes (medvilninę, satino juostelę). Tai papildoma paslauga už papildomą mokestį.',
        'Product FAQ - Karulis',
        18,
        true
    );
-- ============================================
-- STICKERS ADDITIONAL (4 entries)
-- ============================================
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Sticker Shapes',
        'Klausimas: Kokių formų lipdukus gaminate?\nAtsakymas: Standartines (apvalios, stačiakampės, ovalios) ir individualias formas. Individualioms formoms reikalingas kontūrinis pjovimas.',
        'Product FAQ - Stickers',
        15,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Outdoor Stickers',
        'Klausimas: Ar turite lipdukų lauko sąlygoms?\nAtsakymas: Taip, lipdukai ant plėvelės yra atsparūs vandeniui ir UV spinduliams. Tinka automobiliams, langams, lauko reklamai.',
        'Product FAQ - Stickers',
        15,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Sticker Removal',
        'Klausimas: Ar lipdukas lengvai nuimamas?\nAtsakymas: Standartiniai lipdukai turi nuolatinį klijų sluoksnį. Lengvai nuimamus (removable) galime pagaminti pagal užsakymą.',
        'Product FAQ - Stickers',
        15,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Kiss Cut vs Die Cut Stickers',
        'Klausimas: Kuo skiriasi kiss-cut nuo die-cut lipdukų?\nAtsakymas: Kiss-cut – pjaunamas tik lipdukas, bet ne pagrindas (lengva nulupti). Die-cut – pjaunama visiškai (atskiri gabaliukai).',
        'Product FAQ - Stickers',
        15,
        true
    );
-- ============================================
-- POSTERS & BANNERS (3 entries)
-- ============================================
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Large Format Printing',
        'Klausimas: Ar spausdinate didelio formato plakatus?\nAtsakymas: Taip, spausdiname plakatus iki A0 formato ir didesnius. Dideliam formatui raiška gali būti 150 DPI.',
        'Product FAQ - Posters',
        15,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Poster Materials',
        'Klausimas: Ant kokių medžiagų spausdinami plakatai?\nAtsakymas: Kreidinis popierius (130-200g), sinjtetinis popierius (atsparus vandeniui), pieninis PVC (roll-up stovas).',
        'Product FAQ - Posters',
        15,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Poster Mounting',
        'Klausimas: Ar galite pritvirtinti plakatą ant putų kartono?\nAtsakymas: Taip, siūlome montavimą ant Kapa (foam board) – lengvas ir tvirtas pagrindas parodoms ar ekspozicijoms.',
        'Product FAQ - Posters',
        15,
        true
    );
-- ============================================
-- GENERAL PRINTING (5 entries)
-- ============================================
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Small Quantity Printing',
        'Klausimas: Ar galima užsakyti mažą kiekį?\nAtsakymas: Taip, skaitmeninė spauda leidžia spausdinti nuo 1 vnt. Tačiau mažam kiekiui vieneto kaina bus didesnė.',
        'Product FAQ - General',
        15,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Large Quantity Discount',
        'Klausimas: Ar taikote nuolaidas dideliems kiekiams?\nAtsakymas: Taip, kuo didesnis tiražas – tuo pigesnė vieneto kaina. Nuo 500+ vnt. taikomi gerokai mažesni įkainiai.',
        'Product FAQ - General',
        15,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Reorder Same Design',
        'Klausimas: Ar galiu pakartoti tą patį užsakymą?\nAtsakymas: Taip, saugome jūsų maketus. Pakartotinis užsakymas – paprastesnis ir greitesnis procesas.',
        'Product FAQ - General',
        15,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'White Ink Printing',
        'Klausimas: Ar galite spausdinti balta spalva?\nAtsakymas: Taip, turime baltą spaudą ant tamsių ar skaidrių medžiagų. Tai ypač aktualu lipdukams ir pakuotėms.',
        'Product FAQ - General',
        15,
        true
    );
INSERT INTO public.ai_knowledge (topic, content, category, priority, is_active)
VALUES (
        'Color Accuracy',
        'Klausimas: Ar spalvos bus tokios pačios kaip ekrane?\nAtsakymas: Spausdintos spalvos gali šiek tiek skirtis nuo ekrano dėl CMYK/RGB skirtumo. Rekomenduojame užsakyti spausdintą proof.',
        'Product FAQ - General',
        15,
        true
    );