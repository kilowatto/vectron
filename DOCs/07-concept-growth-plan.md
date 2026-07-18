# Concept growth plan — presidents, banks, cars, weather, spatial words, polysemy

> **Status: planning only.** This document does not add any concept to `worker/src/data/seedConcepts.ts`, does not run the seed pipeline, and does not deploy anything. It exists so the next implementation pass has an exact, decided spec instead of vague scope. Current live dataset (verified via `/api/health`): **2,263 concepts**.
>
> **Related — lexicon (4 000 verbs + 4 000 adjectives + tenses):** see [`08-lexicon-verbs-adjectives-infra.md`](./08-lexicon-verbs-adjectives-infra.md). That wave is **separate** from this entity wave (presidents/banks/cars). Do not put every verb conjugation in the cube — lemma-first + D1/KV morphology (details in `08`).

## English

### 0. Relationship to the lexicon wave (`08`)

This file = **entity / encyclopedic** growth.  
`08` = **grammatical lexicon** (verbs, adjectives, forms).  

Recommended shipping order vs [`04-build-order.md`](./04-build-order.md): P0 funcion → lexicon lemmas (`08`) → mode morph → then this presidents/banks wave (or interleave small entity batches after morph works).

The user asked for a big new wave of concepts (presidents, banks, cars, weather, spatial words, a polysemy set) plus some previously-planned domains, decided via 17 interactive questions (16 planned + 1 follow-up to pin down which backlog items to include). This doc is the single source of truth for **what** to build; the actual seeding is a separate future pass.

### 2. Decisions locked in (from the Q&A)

| # | Topic | Decision |
|---|-------|----------|
| 1 | Presidents scope | **Exhaustive** — every head of state/government for ~100 most populous nations, last 200 years. Not curated. |
| 2 | Non-presidential systems | Include the equivalent (prime minister / monarch) as the head of government/state entry. |
| 3 | Embedding text pattern | **Enrich the embedded text** (not the bare name) — e.g. embed `"Vicente Fox, president of Mexico (2000–2006)"`, not just `"Vicente Fox"`. This is a deliberate departure from the current `personajes` pattern (bare name only, e.g. `"elon musk"`), needed to make the country/bank ↔ person/bank spatial relation real instead of accidental. Same rule applies to banks (headquarters city/country in the embedded text). |
| 4 | US & Mexico | Literal, complete rosters — the two anchor countries, no curation. Include exact dates (helps the Historia-domain angle). |
| 5 | Global bank ranking | Mixed: large banks by total assets **+** relevant neobanks even if small by assets (Nu, Revolut, Klarna, etc.). |
| 6 | Mexico banks/SOFIPOs | **All** CNBV-regulated entities (~95: ~50 bancos múltiples + ~45 SOFIPOs), not just the well-known ones. Legal name + commercial name both captured. |
| 7 | US banks | Top 100 by assets **+ Granger National Bank as an explicit exception** (entry #101, outside the ranking — a small community bank in Granger, TX, near Austin, that would not qualify by size). |
| 8 | Banks + city relation | Same enriched-text treatment as presidents (HQ city/country embedded, not just in traits). |
| 9 | Car entries | **Brand and model as separate, unlinked particles** (not one combined "Tesla Model 3" particle). |
| 10 | Car mix | Current lineup **+ discontinued historic icons** (Beetle, Model T, etc.), broad multi-brand mix, not EV-only. |
| 11 | Missing weather words | Add as **adjectives** (`frío`, `caluroso`, `soleado`, `nublado`, `despejado`) — consistent with the existing `partOfSpeech` pattern, not new abstract nouns. |
| 12 | Spatial/deictic words | Include anyway, explicitly as a **pedagogical example of embedding limits** for low-semantic-content function words. |
| 13 | "hoja" polysemy | Same disambiguation pattern already used for café/sabana: `hoja (papel)` / `hoja (árbol)` / `hoja (cuchillo)`. |
| 14 | Backlog items to fold in | Deeper biología (animal + vegetal), more mitología cultures, modismos/frases hechas (new), emociones (top-up — **see §3, this domain already exists**). Explicitly **not** included this wave: more programación/tecnología, estados de México/EEUU (not selected when asked — left for a future wave, see §9). |
| 15 | Batch size | Document everything as **one big wave**, not artificially split into delivery sub-phases. |
| 16 | Tokens-vs-embedding tension | Left as an **open risk**, decided with real data at implementation time (see §8). |

### 3. Correction to stale planning notes

Two "already planned, still missing" items from prior session notes turned out to be **wrong** — verified directly against `worker/src/data/seedConcepts.ts`, not assumed from memory:

- **`emociones` domain already exists** — 30 concepts (joy, sadness, fear, anger, surprise, disgust, love, hate, anxiety, calm, hope, despair, pride, shame, guilt, envy, jealousy, gratitude, compassion, empathy, loneliness, nostalgia, euphoria, frustration, confusion, curiosity, boredom, enthusiasm, satisfaction, regret). The user's request is a **top-up**, not a from-scratch domain.
- **`mitologia` already covers 14 cultures**, not 7: griega, nórdica, egipcia, maya, azteca, inca, fenicia, celta, china, japonesa, hindú, eslava, africana, polinesia. Only Celtic/Chinese/Japanese/Hindu/Slavic/African/Polynesian were actually missing when that note was written; they have since shipped. The real gap is smaller than previously logged (see §7.2).
- **`idiomas` domain exists but means spoken languages** (español, inglés, mandarín, ...), not idiomatic expressions — genuinely distinct from the new "modismos" ask, no overlap.
- **`transporte` domain exists** with generic transport nouns (automóvil, camión, motor, volante...) but **zero specific brands or models** — the car-brand/model wave is a clean addition, no duplicates to check against beyond this doc's own list.

### 4. Data model constraints (read before implementing)

- `SeedConcept.traits` is `Record<string, string | number | boolean>` — flat key-value, shown on the concept card, **has no effect on 3D position**.
- The embedding sent to Workers AI is **`wordEn` alone** (see `worker/scripts/seed.ts`: `const texts = batch.map((c) => c.wordEn);`). Nothing else — not `taxonomy`, not `traits` — feeds the vector. This is why decision #3 (enrich the text) is structural, not cosmetic: without it, "Vicente Fox" and "Mexico" have no guaranteed relationship in the cube, only what the embedding model's own world knowledge happens to encode.
- `PartOfSpeech` today is `"sustantivo" | "adjetivo" | "verbo"` only — **no `"adverbio"` value exists**. The spatial/deictic words (§7.4) need this type extended before they can be tagged correctly; don't force them into `"adjetivo"` as a workaround. **Closed 2026-07-19:** `funcion` + `adverbio` land together in one type migration at P0, see [`09-funcion-pack.md`](./09-funcion-pack.md). This wave (§6–§7) stays P9 either way — see [`08`](./08-lexicon-verbs-adjectives-infra.md) §10.
- Multi-word concept names already work end-to-end (chain-line matching does a greedy n-gram scan, not token-by-token) — confirmed safe for enriched president/bank strings and for modismos (full phrases).
- New domains need three things or they render gray/unlabeled (checklist from prior sessions, still true): (1) entry in `seedConcepts.ts`, (2) a color in `DOMAIN_HUES` (`app/src/scene/particleField.ts`), (3) an i18n label + `DOMAIN_LABEL_KEYS` entry (`app/src/i18n.ts` / `app/src/ui/components/conceptCard.ts`).

### 5. Naming convention for enriched entries

To keep `wordEs`/`wordEn` reusable as both the embedding input and the display name, use this template consistently:

```
wordEn: "{Full Name}, {role} of {country} ({start_year}–{end_year})"
wordEs: "{Nombre completo}, {cargo} de {país} ({año_inicio}–{año_fin})"
```
```
wordEn: "{Bank Name}, bank headquartered in {city}, {country}"
wordEs: "{Nombre del banco}, banco con sede en {ciudad}, {país}"
```

Traits per person: `{ pais, cargo, periodoInicio, periodoFin, ciudadNacimiento? }` (birth city only when reliably known — don't fabricate one).
Traits per bank: `{ paisSede, ciudadSede, nombreLegal, nombreComercial, tipo: "banco" | "sofipo" | "neobanco" }`.

Currently-in-progress presidents/still-in-office people should NOT get a closing year — use `(2018–presente)` / `(2018–present)` style, not a guessed end date.

### 6. Political heads of state/government — the big one

#### 6.1 The 100-country list

Approximate population-rank order (exact rank order doesn't matter for this plan; the **set** of 100 does — re-verify against latest population data before treating this as final):

India, China, United States, Indonesia, Pakistan, Nigeria, Brazil, Bangladesh, Russia, Mexico, Ethiopia, Japan, Philippines, Egypt, DR Congo, Vietnam, Iran, Turkey, Germany, Thailand, United Kingdom, Tanzania, France, South Africa, Italy, Kenya, Myanmar, Colombia, South Korea, Sudan, Uganda, Spain, Algeria, Iraq, Argentina, Afghanistan, Yemen, Canada, Poland, Morocco, Angola, Ukraine, Uzbekistan, Malaysia, Mozambique, Ghana, Peru, Saudi Arabia, Madagascar, Côte d'Ivoire, Nepal, Venezuela, Cameroon, Niger, Australia, North Korea, Syria, Mali, Burkina Faso, Sri Lanka, Kazakhstan, Chile, Malawi, Zambia, Romania, Chad, Somalia, Senegal, Netherlands, Guatemala, Ecuador, Cambodia, Zimbabwe, Guinea, South Sudan, Rwanda, Benin, Burundi, Bolivia, Tunisia, Haiti, Belgium, Jordan, Cuba, Dominican Republic, Sweden, Czech Republic, Greece, Portugal, Azerbaijan, Honduras, Hungary, United Arab Emirates, Tajikistan, Israel, Papua New Guinea, Belarus, Austria, Switzerland, Serbia.

Countries where the head of **government** is not called "president" (use the PM, or the monarch for absolute monarchies, per decision #2): United Kingdom, Japan, Thailand, Netherlands, Belgium, Sweden, Spain (head of government is literally *Presidente del Gobierno* — keep as "president" for Spain), Saudi Arabia (king), Malaysia (PM, with a rotating monarch — monarch optional/secondary), Australia, Canada (PM under a monarch — use PM as primary), Cambodia (king/PM — use PM).

For countries that didn't exist in their current form 200 years ago (most of Africa, several Asian nations — colonial until mid-20th century), "last 200 years" realistically means "since independence": their roster will be shorter (often 15–30 leaders instead of 40+) and that's expected, not a gap.

#### 6.2 United States (anchor #1 — literal, complete)

Confident, standard, well-documented list — the ~42 presidencies covering roughly the last 200 years (from John Quincy Adams onward). **Verify exact term-boundary dates before seeding** — a few (especially 19th-century single-term/assassination successions) are easy to get a day or two wrong on:

John Quincy Adams, Andrew Jackson, Martin Van Buren, William Henry Harrison, John Tyler, James K. Polk, Zachary Taylor, Millard Fillmore, Franklin Pierce, James Buchanan, Abraham Lincoln, Andrew Johnson, Ulysses S. Grant, Rutherford B. Hayes, James A. Garfield, Chester A. Arthur, Grover Cleveland, Benjamin Harrison, Grover Cleveland (second term — same person, disambiguate as a single entry with two periods or one entry spanning both), William McKinley, Theodore Roosevelt, William Howard Taft, Woodrow Wilson, Warren G. Harding, Calvin Coolidge, Herbert Hoover, Franklin D. Roosevelt, Harry S. Truman, Dwight D. Eisenhower, John F. Kennedy, Lyndon B. Johnson, Richard Nixon, Gerald Ford, Jimmy Carter, Ronald Reagan, George H. W. Bush, Bill Clinton, George W. Bush, Barack Obama, Donald Trump (2017–2021), Joe Biden, Donald Trump (2025–present — second, non-consecutive term: disambiguate from the first as `Donald Trump (2017–2021)` / `Donald Trump (2025–presente)`, same real person, two entries — same pattern as Grover Cleveland).

#### 6.3 Mexico (anchor #2 — literal, complete, but flagged as a research task)

Mexico's 19th century had genuine political chaos — multiple interim/caretaker presidents per year in some stretches (e.g. 1846, 1855, 1876, the Santa Anna era with **11 non-consecutive terms**). This is exactly the kind of historical detail worth getting right rather than guessing from memory. **Do not hand-type the full 19th-century roster from a model's memory and seed it as fact** — verify each name + exact date range against a primary/authoritative source (e.g. the official Mexican government historical presidency records) before seeding.

What's safe to state now, high-confidence:
- Well-documented, uncontroversial 20th/21st-century roster (Porfirio Díaz's later terms, Francisco I. Madero, Venustiano Carranza, Álvaro Obregón, Plutarco Elías Calles, Lázaro Cárdenas, Miguel Alemán Valdés, Adolfo López Mateos, Gustavo Díaz Ordaz, Luis Echeverría, José López Portillo, Miguel de la Madrid, Carlos Salinas de Gortari, Ernesto Zedillo, Vicente Fox, Felipe Calderón, Enrique Peña Nieto, Andrés Manuel López Obrador, Claudia Sheinbaum) — roughly 20 names, low risk.
- The turbulent 19th-century stretch (Santa Anna's terms, the many interim presidents of the 1850s–1870s, the Reforma/Second Empire period with Benito Juárez vs. Maximilian I) needs a dedicated verification pass — treat as its own research sub-task, not something to seed off a guess.

#### 6.4 The other 98 countries

**Open question / Pregunta abierta:** hand-enumerating ~2,500+ historical heads of state across 98 countries, with correct dates, from a single pass of model memory, carries real risk of factual errors at this scale — worse for countries with less globally-documented 19th-century political history. Recommended approach for the actual implementation pass:
1. Batch by continent (Americas, Europe, Africa, Asia, Oceania) — 4–5 research sub-passes instead of one.
2. Per country: current head of government/state (high confidence) → recent post-1990s roster (high confidence for most) → older 20th-century roster (medium confidence, verify) → 19th-century roster where the country existed then (lowest confidence, verify hardest).
3. Every entry needs a verifiable source before being typed into `seedConcepts.ts` — this dataset is public and educational; wrong historical claims are a real reputational/pedagogical cost, not a cosmetic one.

Rough size estimate once complete: **~2,500–3,500 entries** just for this category (dominates the wave by far) — consistent with what was flagged and accepted in decision #15.

### 7. The other categories (fully tractable — draft lists included)

#### 7.1 Global banks & neobanks (~200)

By assets (large, traditional):
ICBC, China Construction Bank, Agricultural Bank of China, Bank of China, JPMorgan Chase, Bank of America, Mitsubishi UFJ Financial Group, HSBC, BNP Paribas, Crédit Agricole, Wells Fargo, Citigroup, Banco Santander, Goldman Sachs, Morgan Stanley, Deutsche Bank, Barclays, UBS, Royal Bank of Canada, TD Bank, Itaú Unibanco, Banco Bradesco, DBS Bank, ANZ, Standard Chartered, ING Group, Société Générale, UniCredit, Intesa Sanpaolo, Nordea, Sberbank, State Bank of India, ICICI Bank, HDFC Bank, Mizuho Financial Group, Sumitomo Mitsui Financial Group, Scotiabank, BBVA, CaixaBank, Rabobank, Danske Bank, National Australia Bank, Commonwealth Bank of Australia, Westpac, Emirates NBD, Qatar National Bank, First Abu Dhabi Bank, Standard Bank Group, Absa Group, Nedbank, Bank Mandiri, Maybank, CIMB, Kasikornbank, Bangkok Bank, KB Kookmin Bank, Shinhan Bank, Hana Financial Group, Woori Bank, U.S. Bancorp, PNC Financial Services, Truist Financial, Capital One, Bank of New York Mellon, State Street Corporation, Charles Schwab, Fifth Third Bank, Citizens Financial Group, M&T Bank, Handelsbanken, SEB (Skandinaviska Enskilda Banken), KBC Bank, Erste Group, Raiffeisen Bank International, OTP Bank, PKO Bank Polski, Sberbank Europe, Garanti BBVA, İşbank, Akbank, National Bank of Kuwait, Al Rajhi Bank, Riyad Bank, Samba Financial Group (now SNB), Saudi National Bank, Bank Negara Indonesia, Bank Central Asia, Bank Rakyat Indonesia, Vietcombank, VietinBank, BDO Unibank, Metrobank (Philippines), Bank of Communications, China Merchants Bank, Ping An Bank, Postal Savings Bank of China, Bank of East Asia.

Neobanks / relevant fintech banks (kept even where small by assets):
Nubank, Revolut, N26, Monzo, Starling Bank, Chime, Klarna, WeBank, MYbank, Wise, Varo Bank, Current, Dave, SoFi, Cash App (Block), Neon (Brazil), C6 Bank, Banco Inter, Ualá, RappiCard/RappiPay, Mercado Pago, Grab Financial Group, Tinkoff Bank, Monobank, Bunq, Qonto, Lunar, Zopa Bank, Atom Bank, bunq, Tandem Bank, Yolt, Judo Bank, Up Bank, Volt Bank, WeLab Bank, Airwallex, Mox Bank, Trust Bank (Singapore), Kakao Bank, Toss Bank, KakaoBank, Timo (Vietnam), Jenius (Indonesia), TymeBank (South Africa), Xinja (historic, defunct — flag if included as historically notable).

#### 7.2 Mexico — banks & SOFIPOs (all CNBV-regulated, legal + commercial name)

**Open question / Pregunta abierta:** this list must be cross-checked against CNBV's live official registry (*Instituciones de Banca Múltiple* + *Sociedades Financieras Populares autorizadas*) before seeding — fintechs in particular change licensing structure often (bank-as-a-service partnership vs. own SOFIPO license), and the draft below is a best-effort starting point, not a verified final list.

Bancos múltiples (draft, ~45 of the expected ~50): BBVA México, Citibanamex, Santander México, Banorte, HSBC México, Scotiabank México, Inbursa, Banco Azteca, Banco del Bajío (BanBajío), Banregio, Multiva, Afirme, Banco Ve por Más (BX+), Actinver, Compartamos Banco, Consubanco, Banco Autofin México, ABC Capital, Banco Sabadell México, Bank of America México, JPMorgan México, Barclays México, Deutsche Bank México, MUFG Bank México, ICBC México, Bank of China México, Volkswagen Bank México, Monex, Intercam Banco, CIBanco, Banco Base, UBS Bank México, Bansi, Accendo Banco, Banco Bienestar, Bineo (Banorte's digital brand), Hey Banco (Banregio's digital brand), Banco Finterra, Banco Immobiliario Mexicano, Banco S3 México, Pagatodo, Banco Covalto, Banco Multiva, Amerika Banco.

SOFIPOs (draft, needs the heaviest verification): Finsus, Klar, Stori, Fondeadora, Vexi, Cuenca, Mango, Ualá México, Nu México (financiera), Plata Card, Kubo Financiero, Te Creemos, Alcanza Capital, Ánimo, Weex, Higo, Coru, Fingo, Credijusto, Kapital Bank, Mimoni.

#### 7.3 United States — top 100 banks by assets + Granger National Bank

High-confidence portion (~65, roughly ranked): JPMorgan Chase, Bank of America, Wells Fargo, Citigroup, U.S. Bancorp, PNC Financial Services, Truist Financial, Goldman Sachs, Morgan Stanley, Capital One, TD Bank US, Bank of New York Mellon, State Street Corporation, American Express National Bank, Charles Schwab Bank, Fifth Third Bank, Citizens Financial Group, M&T Bank, Ally Financial, Huntington Bancshares, Regions Financial, KeyCorp, Northern Trust, Discover Bank, Comerica, Zions Bancorporation, First Citizens Bank, Synchrony Bank, East West Bank, Webster Bank, Popular Inc. (Banco Popular), Western Alliance Bancorporation, New York Community Bancorp, Frost Bank, BOK Financial, Commerce Bancshares, Valley National Bancorp, South State Bank, Old National Bancorp, Cadence Bank, Umpqua Bank, Glacier Bancorp, First Interstate BancSystem, Home BancShares, WesBanco, Simmons Bank, Renasant Bank, United Community Banks, Pinnacle Financial Partners, Prosperity Bancshares, Hancock Whitney, Cathay General Bancorp, Hope Bancorp, Bank OZK, Independent Bank Group, FirstBank Colorado, Sandy Spring Bancorp, Associated Banc-Corp, Fulton Financial, F.N.B. Corporation, United Bankshares, Columbia Banking System, Provident Financial Services, Community Bank System, Wintrust Financial, First Hawaiian Bank, Bank of Hawaii.

**Open question / Pregunta abierta:** completing the tail to a true top 100 by assets needs current FDIC/Fed ranking data — the ~65 above are confident, the remaining ~35 should be pulled from an authoritative ranking source rather than guessed.

Explicit exception (decision #7): **Granger National Bank** (Granger, Texas, near Austin) — entry #101, outside the ranking, included by explicit request.

#### 7.4 Weather — the actual gap

Already seeded (18, domain `clima`): lluvia/rain, nieve/snow, viento/wind, tormenta/storm, huracán/hurricane, tornado/tornado, niebla/fog, granizo/hail, arcoíris/rainbow, relámpago/lightning, trueno/thunder, sequía/drought, inundación/flood, clima/weather, temperatura ambiente/ambient temperature, humedad/humidity, nube/cloud, helada/frost, ola de calor/heat wave.

**Actually missing** (decision #11 — add as adjectives, same domain `clima`, `partOfSpeech: "adjetivo"`): frío/cold, caluroso/hot, soleado/sunny, nublado/cloudy, despejado/clear (sky).

#### 7.5 Spatial / deictic words

None of these exist yet. Confirmed as a deliberate pedagogical example (decision #12) of where embeddings are weak (low lexical content, meaning is almost entirely deictic/pragmatic). **Requires extending `PartOfSpeech` to add `"adverbio"` first** (see §4) — don't seed these as `"adjetivo"` or unset.

Draft set: lejos/far, cerca/near, aquí/here, acá/here (colloquial), allá/there (far), allí/there, por allá/over there, arriba/up, abajo/down, más arriba/further up, más abajo/further down, en medio/in the middle.

#### 7.6 "hoja" polysemy (decision #13)

Three disambiguated senses, same suffix pattern as `café (bebida)`/`café (color)`:
- `hoja (papel)` / `sheet of paper` — domain `materiales` or `hogar`/oficina, taxonomy `["materiales", "papel"]`.
- `hoja (árbol)` / `leaf` — domain `biologia_vegetal`, taxonomy `["biologia", "vegetal", "parte"]`.
- `hoja (cuchillo)` / `blade` — domain `herramientas`, taxonomy `["herramientas", "parte"]`.

**Verify before seeding:** confirm no plain unsuffixed `"hoja"` already exists anywhere in `biologia_vegetal` (a plant-part concept named just "hoja" without the sense suffix) — if it does, rename it to `hoja (árbol)` instead of creating a duplicate.

#### 7.7 Cars — brands & models (separate particles, current + historic)

Brands (~55, domain `transporte`, taxonomy `["transporte", "marca"]`): Toyota, Honda, Ford, Chevrolet, Volkswagen, Nissan, Hyundai, Kia, BMW, Mercedes-Benz, Audi, Mazda, Subaru, Jeep, Ram, GMC, Buick, Chrysler, Dodge, Lincoln, Cadillac, Volvo, Porsche, Land Rover, Jaguar, Mini, Fiat, Peugeot, Renault, Citroën, Škoda, SEAT, Opel, Alfa Romeo, Lancia, Mitsubishi, Suzuki, Isuzu, Lexus, Infiniti, Acura, Genesis, Tesla, Rivian, Lucid Motors, Polestar, BYD, NIO, XPeng, Li Auto, VinFast, Fisker, Ferrari, Lamborghini, Bugatti, Maserati.

Models (target ~300, domain `transporte`, taxonomy `["transporte", "modelo"]`) — representative spread, not exhaustive; fill out by category:
- **Sedans/compacts:** Corolla, Camry, Civic, Accord, Focus, Fusion, Fiesta, Sentra, Altima, Elantra, Sonata, Forte, Optima, Jetta, Passat, Golf, Mazda3, Mazda6, Impreza, Legacy, 3 Series, 5 Series, C-Class, E-Class, A3, A4, A6, Model 3, Model S.
- **SUVs/crossovers:** RAV4, CR-V, Escape, Explorer, Rogue, Tucson, Santa Fe, Sportage, Sorento, Tiguan, Atlas, CX-5, Outback, Forester, X1, X3, X5, GLA, GLC, GLE, Q3, Q5, Q7, Model X, Model Y, Wrangler, Grand Cherokee, Cherokee, Compass, Renegade.
- **Pickups:** F-150, Silverado, Ram 1500, Tundra, Tacoma, Ranger, Colorado, Frontier, Titan, Sierra, Cybertruck, R1T.
- **Sports/performance:** Mustang, Camaro, Corvette, 911, Cayman, Boxster, GT-R, Supra, MX-5 Miata, WRX STI, Civic Type R, M3, M5, AMG GT, R8, Huracán, Aventador, Chiron, LaFerrari, F8 Tributo.
- **EVs (non-Tesla):** Ioniq 5, Ioniq 6, EV6, Bolt EV, Leaf, ID.4, Ariya, e-tron GT, Taycan, Polestar 2, BYD Seal, BYD Atto 3, NIO ET7, Lucid Air, Rivian R1S.
- **Minivans/vans:** Odyssey, Sienna, Pacifica, Grand Caravan, Transit.
- **Historic/discontinued icons:** Ford Model T, Volkswagen Beetle (original), Volkswagen Kombi/Bus (T1), Chevrolet Bel Air, Ford Mustang (1964½ original), Citroën 2CV, Mini Cooper (original, pre-BMW), Fiat 500 (original, 1957), Trabant 601, Willys Jeep (military original), DeLorean DMC-12, Porsche 356, Chevrolet Corvair, Datsun 240Z, Lancia Delta Integrale, Saab 900, AMC Gremlin, Yugo GV.

Getting to a clean 300 means filling out each bucket further (more trims/generations across the same nameplates, plus regional models — e.g. Latin America has model names that don't exist in the US market) — this draft is the skeleton, not the final count.

### 8. Open risk: enriched text length vs. tokens

Enriching president/bank text (decision #3) makes each entry a full clause instead of 1–3 words — e.g. `"Andrés Manuel López Obrador, president of Mexico (2018–2024)"` is ~11 words, noticeably longer than the dataset's current norm. Per the user's own flag ("piensa también en los tokens, no solo en el embedding"), this has two concrete effects worth measuring once real data exists, not guessing now:
1. **BPE/BGE token count per concept goes up** — a person/bank concept now tokenizes into many more subword pieces than a plain noun, which matters for the Avanzado token-mode UI (per-fragment display, the 12-fragment cap in `tokenMode.ts`) if someone types a president's full enriched name as their test phrase.
2. **Concept-card density** — the `wordEs`/`wordEn` primary/secondary line in `vx-concept-card` is currently a short word pair; a full clause there is a UI question, not just a data question (may need a card layout tweak, e.g. showing the enriched clause as a secondary line and a short display name as primary).

Decision #16: leave this as a documented risk, resolve during implementation with real token counts and a real card screenshot rather than a length cap decided in the abstract now.

### 9. Explicitly deferred (not in this wave)

Selected as "not this time" when asked (§backlog question) or not selected at all:
- More programación/tecnología domain depth.
- Estados de México / EEUU as their own geography subdivision entries.

These stay on the general 15,000-target backlog (see `project_vectron.md` memory / prior progress logs) for a future wave, not this one.

### 10. Rough size impact

| Category | Estimate |
|---|---|
| Presidents/heads of state (100 countries, 200 yrs, exhaustive) | ~2,500–3,500 |
| Global banks & neobanks | ~200 |
| Mexico banks + SOFIPOs | ~90–95 |
| US banks + Granger exception | ~101 |
| Car brands | ~55 |
| Car models | ~300 |
| Weather (missing only) | 5 |
| Spatial/deictic words | ~12 |
| "hoja" polysemy | 3 |
| Biología top-up (backlog) | ~150–200 |
| Mitología top-up (backlog, real gap is smaller than previously logged) | ~50–80 |
| Modismos/frases hechas (backlog, new domain) | ~40–60 |
| Emociones top-up (backlog, domain already exists) | ~15–20 |
| **Total this wave** | **~3,500–4,650** |

Current 2,263 + this wave ≈ **5,800–6,900**, a large step toward the 15,000 target without claiming to reach it in one wave.

---

## Español

### 0. Relación con la ola de léxico (`08`)

Este archivo = crecimiento **de entidades / enciclopedia**.  
`08` = **léxico gramatical** (verbos, adjetivos, formas).  

Orden recomendado: P0 funcion → lemmas de léxico (`08`) → morph → luego esta tanda de presidentes/bancos.

### 1. Por qué existe este documento

El usuario pidió una tanda grande de conceptos nuevos (presidentes, bancos, coches, clima, palabras espaciales, un set de polisemia) más algunos dominios ya planeados antes, decidido vía 17 preguntas interactivas (16 planeadas + 1 de seguimiento para precisar qué pendientes incluir). Este doc es la única fuente de verdad de **qué** construir; el sembrado real es un paso futuro separado.

### 2. Decisiones cerradas (de la ronda de preguntas)

| # | Tema | Decisión |
|---|------|----------|
| 1 | Alcance de presidentes | **Exhaustivo** — todo jefe de estado/gobierno de las ~100 naciones más pobladas, últimos 200 años. No curado. |
| 2 | Sistemas no presidenciales | Incluir el equivalente (primer ministro / monarca) como entrada de jefe de gobierno/estado. |
| 3 | Patrón de texto embebido | **Enriquecer el texto embebido** (no el nombre plano) — ej. embeber `"Vicente Fox, president of Mexico (2000–2006)"`, no solo `"Vicente Fox"`. Es una desviación deliberada del patrón actual de `personajes` (solo nombre plano, ej. `"elon musk"`), necesaria para que la relación espacial país/banco ↔ persona/banco sea real y no accidental. Misma regla para bancos (ciudad/país de sede en el texto embebido). |
| 4 | EEUU y México | Listas literales y completas — los 2 países ancla, sin curar. Incluir fechas exactas (ayuda al ángulo de Historia). |
| 5 | Ranking de bancos globales | Mixto: bancos grandes por activos totales **+** neobancos relevantes aunque sean chicos (Nu, Revolut, Klarna, etc.). |
| 6 | Bancos/SOFIPOs de México | **Todos** los regulados por CNBV (~95: ~50 bancos múltiples + ~45 SOFIPOs), no solo los conocidos. Nombre legal + nombre comercial ambos capturados. |
| 7 | Bancos de EEUU | Top 100 por activos **+ Granger National Bank como excepción explícita** (entrada #101, fuera del ranking — banco comunitario chico en Granger, TX, cerca de Austin, que no calificaría por tamaño). |
| 8 | Relación bancos + ciudad | Mismo tratamiento de texto enriquecido que presidentes (ciudad/país de sede embebido, no solo en traits). |
| 9 | Entradas de coches | **Marca y modelo como partículas separadas, sin ligar** (no una sola partícula combinada "Tesla Model 3"). |
| 10 | Mezcla de coches | Línea actual **+ íconos históricos descontinuados** (Beetle, Model T, etc.), mezcla amplia multimarca, no solo EVs. |
| 11 | Palabras de clima faltantes | Agregar como **adjetivos** (`frío`, `caluroso`, `soleado`, `nublado`, `despejado`) — consistente con el patrón `partOfSpeech` existente, no como sustantivos abstractos nuevos. |
| 12 | Palabras espaciales/deícticas | Incluirlas de todos modos, explícitamente como **ejemplo pedagógico de los límites de los embeddings** para palabras función de bajo contenido semántico. |
| 13 | Polisemia de "hoja" | Mismo patrón de desambiguación ya usado para café/sabana: `hoja (papel)` / `hoja (árbol)` / `hoja (cuchillo)`. |
| 14 | Pendientes a incluir | Biología más profunda (animal + vegetal), más culturas de mitología, modismos/frases hechas (nuevo), emociones (top-up — **ver §3, este dominio ya existe**). Explícitamente **no** incluido esta tanda: más programación/tecnología, estados de México/EEUU (no seleccionados al preguntar — quedan para una tanda futura, ver §9). |
| 15 | Tamaño de la tanda | Documentar todo como **una sola tanda grande**, sin subdividir artificialmente en fases de entrega. |
| 16 | Tensión tokens-vs-embedding | Se deja como **riesgo abierto**, se decide con datos reales al implementar (ver §8). |

### 3. Corrección a notas de planeación desactualizadas

Dos ítems de "ya planeado, aún falta" de notas de sesiones previas resultaron **incorrectos** — verificado directamente contra `worker/src/data/seedConcepts.ts`, no asumido de memoria:

- **El dominio `emociones` ya existe** — 30 conceptos (alegría, tristeza, miedo, enojo, sorpresa, asco, amor, odio, ansiedad, calma, esperanza, desesperación, orgullo, vergüenza, culpa, envidia, celos, gratitud, compasión, empatía, soledad, nostalgia, euforia, frustración, confusión, curiosidad, aburrimiento, entusiasmo, satisfacción, arrepentimiento). Lo pedido por el usuario es un **top-up**, no un dominio desde cero.
- **`mitologia` ya cubre 14 culturas**, no 7: griega, nórdica, egipcia, maya, azteca, inca, fenicia, celta, china, japonesa, hindú, eslava, africana, polinesia. Solo faltaba celta/china/japonesa/hindú/eslava/africana/polinesia cuando se escribió esa nota; ya se sembraron desde entonces. El hueco real es más chico de lo registrado antes (ver §7.2).
- **`idiomas` existe pero son idiomas hablados** (español, inglés, mandarín...), no expresiones idiomáticas — genuinamente distinto del pedido nuevo de "modismos", sin traslape.
- **`transporte` ya existe** con sustantivos genéricos de transporte (automóvil, camión, motor, volante...) pero **cero marcas o modelos específicos** — la tanda de marcas/modelos de coches es una adición limpia, sin duplicados que revisar más allá de este mismo documento.

### 4. Restricciones del modelo de datos (leer antes de implementar)

- `SeedConcept.traits` es `Record<string, string | number | boolean>` — clave-valor plano, se muestra en la tarjeta del concepto, **no afecta la posición 3D**.
- El embedding que se envía a Workers AI es **`wordEn` solo** (ver `worker/scripts/seed.ts`: `const texts = batch.map((c) => c.wordEn);`). Nada más — ni `taxonomy` ni `traits` alimentan el vector. Por eso la decisión #3 (enriquecer el texto) es estructural, no cosmética: sin eso, "Vicente Fox" y "México" no tienen relación garantizada en el cubo, solo lo que el conocimiento del mundo del modelo de embeddings ya codifique por su cuenta.
- `PartOfSpeech` hoy es solo `"sustantivo" | "adjetivo" | "verbo"` — **no existe el valor `"adverbio"`**. Las palabras espaciales/deícticas (§7.4) necesitan que se extienda ese tipo antes de poder etiquetarse correctamente; no forzarlas como `"adjetivo"` de parche. **Cerrado 2026-07-19:** `funcion` + `adverbio` se agregan juntos en una sola migración de tipo en P0, ver [`09-funcion-pack.md`](./09-funcion-pack.md). Esta tanda (§6–§7) se queda en P9 de todas formas — ver [`08`](./08-lexicon-verbs-adjectives-infra.md) §10.
- Los conceptos de varias palabras ya funcionan de punta a punta (el emparejamiento de líneas hace un escaneo de n-gramas, no token por token) — confirmado seguro para strings enriquecidos de presidentes/bancos y para modismos (frases completas).
- Los dominios nuevos necesitan tres cosas o se ven grises/sin etiqueta (checklist de sesiones previas, sigue vigente): (1) entrada en `seedConcepts.ts`, (2) color en `DOMAIN_HUES` (`app/src/scene/particleField.ts`), (3) etiqueta i18n + entrada en `DOMAIN_LABEL_KEYS` (`app/src/i18n.ts` / `app/src/ui/components/conceptCard.ts`).

### 5. Convención de nombres para entradas enriquecidas

Para que `wordEs`/`wordEn` sigan sirviendo tanto de input de embedding como de nombre a mostrar, usar esta plantilla de forma consistente:

```
wordEn: "{Nombre completo}, {cargo} of {país} ({año_inicio}–{año_fin})"
wordEs: "{Nombre completo}, {cargo} de {país} ({año_inicio}–{año_fin})"
```
```
wordEn: "{Nombre del banco}, bank headquartered in {ciudad}, {país}"
wordEs: "{Nombre del banco}, banco con sede en {ciudad}, {país}"
```

Traits por persona: `{ pais, cargo, periodoInicio, periodoFin, ciudadNacimiento? }` (ciudad de nacimiento solo cuando se sepa con confianza — no inventar una).
Traits por banco: `{ paisSede, ciudadSede, nombreLegal, nombreComercial, tipo: "banco" | "sofipo" | "neobanco" }`.

Las personas actualmente en el cargo NO deben llevar año de cierre — usar el estilo `(2018–presente)`, no una fecha de fin adivinada.

### 6. Jefes de estado/gobierno — la categoría grande

#### 6.1 La lista de 100 países

Orden aproximado por población (el orden exacto no importa para este plan; el **conjunto** de 100 sí — reverificar contra datos de población más recientes antes de tratarlo como final):

India, China, Estados Unidos, Indonesia, Pakistán, Nigeria, Brasil, Bangladesh, Rusia, México, Etiopía, Japón, Filipinas, Egipto, RD del Congo, Vietnam, Irán, Turquía, Alemania, Tailandia, Reino Unido, Tanzania, Francia, Sudáfrica, Italia, Kenia, Myanmar, Colombia, Corea del Sur, Sudán, Uganda, España, Argelia, Irak, Argentina, Afganistán, Yemen, Canadá, Polonia, Marruecos, Angola, Ucrania, Uzbekistán, Malasia, Mozambique, Ghana, Perú, Arabia Saudita, Madagascar, Costa de Marfil, Nepal, Venezuela, Camerún, Níger, Australia, Corea del Norte, Siria, Malí, Burkina Faso, Sri Lanka, Kazajistán, Chile, Malaui, Zambia, Rumania, Chad, Somalia, Senegal, Países Bajos, Guatemala, Ecuador, Camboya, Zimbabue, Guinea, Sudán del Sur, Ruanda, Benín, Burundi, Bolivia, Túnez, Haití, Bélgica, Jordania, Cuba, República Dominicana, Suecia, República Checa, Grecia, Portugal, Azerbaiyán, Honduras, Hungría, Emiratos Árabes Unidos, Tayikistán, Israel, Papúa Nueva Guinea, Bielorrusia, Austria, Suiza, Serbia.

Países donde el jefe de **gobierno** no se llama "presidente" (usar el PM, o el monarca en monarquías absolutas, según decisión #2): Reino Unido, Japón, Tailandia, Países Bajos, Bélgica, Suecia, España (el jefe de gobierno se llama literalmente *Presidente del Gobierno* — mantener "presidente" para España), Arabia Saudita (rey), Malasia (PM, con monarca rotativo — monarca opcional/secundario), Australia, Canadá (PM bajo un monarca — usar el PM como principal), Camboya (rey/PM — usar el PM).

Para países que no existían en su forma actual hace 200 años (casi toda África, varias naciones asiáticas — coloniales hasta mediados del s.XX), "últimos 200 años" realmente significa "desde la independencia": su lista será más corta (a menudo 15–30 líderes en vez de 40+) y eso es esperado, no un hueco.

#### 6.2 Estados Unidos (ancla #1 — literal, completa)

Lista confiable, estándar, bien documentada — las ~42 presidencias que cubren aproximadamente los últimos 200 años (desde John Quincy Adams en adelante). **Verificar fechas exactas de límite de mandato antes de sembrar** — algunas (especialmente sucesiones por asesinato/término único del s.XIX) son fáciles de errar por un día o dos:

John Quincy Adams, Andrew Jackson, Martin Van Buren, William Henry Harrison, John Tyler, James K. Polk, Zachary Taylor, Millard Fillmore, Franklin Pierce, James Buchanan, Abraham Lincoln, Andrew Johnson, Ulysses S. Grant, Rutherford B. Hayes, James A. Garfield, Chester A. Arthur, Grover Cleveland, Benjamin Harrison, Grover Cleveland (segundo término — misma persona, desambiguar como una entrada con dos períodos o una que abarque ambos), William McKinley, Theodore Roosevelt, William Howard Taft, Woodrow Wilson, Warren G. Harding, Calvin Coolidge, Herbert Hoover, Franklin D. Roosevelt, Harry S. Truman, Dwight D. Eisenhower, John F. Kennedy, Lyndon B. Johnson, Richard Nixon, Gerald Ford, Jimmy Carter, Ronald Reagan, George H. W. Bush, Bill Clinton, George W. Bush, Barack Obama, Donald Trump (2017–2021), Joe Biden, Donald Trump (2025–presente — segundo término no consecutivo: desambiguar del primero como `Donald Trump (2017–2021)` / `Donald Trump (2025–presente)`, misma persona real, dos entradas — mismo patrón que Grover Cleveland).

#### 6.3 México (ancla #2 — literal, completa, pero marcada como tarea de investigación)

El siglo XIX mexicano tuvo caos político real — múltiples presidentes interinos/de facto por año en algunos tramos (ej. 1846, 1855, 1876, la era de Santa Anna con **11 términos no consecutivos**). Es justo el tipo de detalle histórico que vale la pena tener bien en vez de adivinar de memoria. **No escribir a mano la lista completa del s.XIX desde la memoria de un modelo y sembrarla como hecho** — verificar cada nombre + rango de fechas exacto contra una fuente primaria/autoritativa (ej. los registros históricos oficiales de la presidencia mexicana) antes de sembrar.

Lo que es seguro afirmar ahora, alta confianza:
- Lista del s.XX/XXI bien documentada, sin controversia (últimos términos de Porfirio Díaz, Francisco I. Madero, Venustiano Carranza, Álvaro Obregón, Plutarco Elías Calles, Lázaro Cárdenas, Miguel Alemán Valdés, Adolfo López Mateos, Gustavo Díaz Ordaz, Luis Echeverría, José López Portillo, Miguel de la Madrid, Carlos Salinas de Gortari, Ernesto Zedillo, Vicente Fox, Felipe Calderón, Enrique Peña Nieto, Andrés Manuel López Obrador, Claudia Sheinbaum) — unos 20 nombres, riesgo bajo.
- El tramo turbulento del s.XIX (términos de Santa Anna, los muchos presidentes interinos de 1850s–1870s, el período de la Reforma/Segundo Imperio con Benito Juárez vs. Maximiliano I) necesita un pase de verificación dedicado — tratarlo como su propia sub-tarea de investigación, no algo para sembrar de una adivinanza.

#### 6.4 Los otros 98 países

**Pregunta abierta:** enumerar a mano ~2,500+ jefes de estado históricos en 98 países, con fechas correctas, de un solo pase de memoria de modelo, tiene riesgo real de errores factuales a esta escala — peor para países con historia política del s.XIX menos documentada globalmente. Enfoque recomendado para el pase de implementación real:
1. Por lotes por continente (América, Europa, África, Asia, Oceanía) — 4–5 sub-pases de investigación en vez de uno.
2. Por país: jefe de gobierno/estado actual (alta confianza) → lista reciente post-1990s (alta confianza en la mayoría) → lista del s.XX más antigua (confianza media, verificar) → lista del s.XIX donde el país ya existía (confianza más baja, la más difícil de verificar).
3. Cada entrada necesita una fuente verificable antes de escribirse en `seedConcepts.ts` — este dataset es público y educativo; afirmaciones históricas equivocadas son un costo real de reputación/pedagogía, no cosmético.

Estimado de tamaño una vez completo: **~2,500–3,500 entradas** solo para esta categoría (domina la tanda por mucho) — consistente con lo señalado y aceptado en la decisión #15.

### 7. Las demás categorías (totalmente abordables — listas borrador incluidas)

#### 7.1 Bancos y neobancos globales (~200)

Por activos (grandes, tradicionales):
ICBC, China Construction Bank, Agricultural Bank of China, Bank of China, JPMorgan Chase, Bank of America, Mitsubishi UFJ Financial Group, HSBC, BNP Paribas, Crédit Agricole, Wells Fargo, Citigroup, Banco Santander, Goldman Sachs, Morgan Stanley, Deutsche Bank, Barclays, UBS, Royal Bank of Canada, TD Bank, Itaú Unibanco, Banco Bradesco, DBS Bank, ANZ, Standard Chartered, ING Group, Société Générale, UniCredit, Intesa Sanpaolo, Nordea, Sberbank, State Bank of India, ICICI Bank, HDFC Bank, Mizuho Financial Group, Sumitomo Mitsui Financial Group, Scotiabank, BBVA, CaixaBank, Rabobank, Danske Bank, National Australia Bank, Commonwealth Bank of Australia, Westpac, Emirates NBD, Qatar National Bank, First Abu Dhabi Bank, Standard Bank Group, Absa Group, Nedbank, Bank Mandiri, Maybank, CIMB, Kasikornbank, Bangkok Bank, KB Kookmin Bank, Shinhan Bank, Hana Financial Group, Woori Bank, U.S. Bancorp, PNC Financial Services, Truist Financial, Capital One, Bank of New York Mellon, State Street Corporation, Charles Schwab, Fifth Third Bank, Citizens Financial Group, M&T Bank, Handelsbanken, SEB, KBC Bank, Erste Group, Raiffeisen Bank International, OTP Bank, PKO Bank Polski, Garanti BBVA, İşbank, Akbank, National Bank of Kuwait, Al Rajhi Bank, Riyad Bank, Saudi National Bank, Bank Negara Indonesia, Bank Central Asia, Bank Rakyat Indonesia, Vietcombank, VietinBank, BDO Unibank, Metrobank (Filipinas), Bank of Communications, China Merchants Bank, Ping An Bank, Postal Savings Bank of China, Bank of East Asia.

Neobancos / fintech relevantes (se incluyen aunque sean chicos por activos):
Nubank, Revolut, N26, Monzo, Starling Bank, Chime, Klarna, WeBank, MYbank, Wise, Varo Bank, Current, Dave, SoFi, Cash App (Block), Neon (Brasil), C6 Bank, Banco Inter, Ualá, RappiCard/RappiPay, Mercado Pago, Grab Financial Group, Tinkoff Bank, Monobank, Bunq, Qonto, Lunar, Zopa Bank, Atom Bank, Tandem Bank, Yolt, Judo Bank, Up Bank, Volt Bank, WeLab Bank, Airwallex, Mox Bank, Trust Bank (Singapur), Kakao Bank, Toss Bank, Timo (Vietnam), Jenius (Indonesia), TymeBank (Sudáfrica).

#### 7.2 México — bancos y SOFIPOs (todos los regulados por CNBV, legal + comercial)

**Pregunta abierta:** esta lista debe cruzarse contra el registro oficial vivo de la CNBV (*Instituciones de Banca Múltiple* + *Sociedades Financieras Populares autorizadas*) antes de sembrar — los fintechs en particular cambian de estructura de licencia seguido (banca como servicio de un tercero vs. licencia SOFIPO propia), y el borrador de abajo es un punto de partida de mejor esfuerzo, no una lista final verificada.

Bancos múltiples (borrador, ~45 de los ~50 esperados): BBVA México, Citibanamex, Santander México, Banorte, HSBC México, Scotiabank México, Inbursa, Banco Azteca, Banco del Bajío (BanBajío), Banregio, Multiva, Afirme, Banco Ve por Más (BX+), Actinver, Compartamos Banco, Consubanco, Banco Autofin México, ABC Capital, Banco Sabadell México, Bank of America México, JPMorgan México, Barclays México, Deutsche Bank México, MUFG Bank México, ICBC México, Bank of China México, Volkswagen Bank México, Monex, Intercam Banco, CIBanco, Banco Base, UBS Bank México, Bansi, Accendo Banco, Banco Bienestar, Bineo (marca digital de Banorte), Hey Banco (marca digital de Banregio), Banco Finterra, Banco Inmobiliario Mexicano, Banco S3 México, Pagatodo, Banco Covalto, Amerika Banco.

SOFIPOs (borrador, necesita la verificación más pesada): Finsus, Klar, Stori, Fondeadora, Vexi, Cuenca, Mango, Ualá México, Nu México (financiera), Plata Card, Kubo Financiero, Te Creemos, Alcanza Capital, Ánimo, Weex, Higo, Coru, Fingo, Credijusto, Kapital Bank, Mimoni.

#### 7.3 Estados Unidos — top 100 bancos por activos + Granger National Bank

Porción de alta confianza (~65, aproximadamente ordenados): JPMorgan Chase, Bank of America, Wells Fargo, Citigroup, U.S. Bancorp, PNC Financial Services, Truist Financial, Goldman Sachs, Morgan Stanley, Capital One, TD Bank US, Bank of New York Mellon, State Street Corporation, American Express National Bank, Charles Schwab Bank, Fifth Third Bank, Citizens Financial Group, M&T Bank, Ally Financial, Huntington Bancshares, Regions Financial, KeyCorp, Northern Trust, Discover Bank, Comerica, Zions Bancorporation, First Citizens Bank, Synchrony Bank, East West Bank, Webster Bank, Popular Inc. (Banco Popular), Western Alliance Bancorporation, New York Community Bancorp, Frost Bank, BOK Financial, Commerce Bancshares, Valley National Bancorp, South State Bank, Old National Bancorp, Cadence Bank, Umpqua Bank, Glacier Bancorp, First Interstate BancSystem, Home BancShares, WesBanco, Simmons Bank, Renasant Bank, United Community Banks, Pinnacle Financial Partners, Prosperity Bancshares, Hancock Whitney, Cathay General Bancorp, Hope Bancorp, Bank OZK, Independent Bank Group, FirstBank Colorado, Sandy Spring Bancorp, Associated Banc-Corp, Fulton Financial, F.N.B. Corporation, United Bankshares, Columbia Banking System, Provident Financial Services, Community Bank System, Wintrust Financial, First Hawaiian Bank, Bank of Hawaii.

**Pregunta abierta:** completar la cola hasta un top 100 real por activos necesita datos de ranking FDIC/Fed actuales — los ~65 de arriba tienen confianza alta, los ~35 restantes deben sacarse de una fuente de ranking autoritativa en vez de adivinarse.

Excepción explícita (decisión #7): **Granger National Bank** (Granger, Texas, cerca de Austin) — entrada #101, fuera del ranking, incluida por pedido explícito.

#### 7.4 Clima — el hueco real

Ya sembrados (18, dominio `clima`): lluvia, nieve, viento, tormenta, huracán, tornado, niebla, granizo, arcoíris, relámpago, trueno, sequía, inundación, clima, temperatura ambiente, humedad, nube, helada, ola de calor.

**Lo que realmente falta** (decisión #11 — agregar como adjetivos, mismo dominio `clima`, `partOfSpeech: "adjetivo"`): frío, caluroso, soleado, nublado, despejado.

#### 7.5 Palabras espaciales / deícticas

Ninguna existe aún. Confirmadas como ejemplo pedagógico deliberado (decisión #12) de dónde los embeddings son débiles (poco contenido léxico, el significado es casi todo deíctico/pragmático). **Requiere extender `PartOfSpeech` para agregar `"adverbio"` primero** (ver §4) — no sembrarlas como `"adjetivo"` ni sin asignar.

Set borrador: lejos, cerca, aquí, acá, allá, allí, por allá, arriba, abajo, más arriba, más abajo, en medio.

#### 7.6 Polisemia de "hoja" (decisión #13)

Tres sentidos desambiguados, mismo patrón de sufijo que `café (bebida)`/`café (color)`:
- `hoja (papel)` — dominio `materiales` o `hogar`/oficina, taxonomy `["materiales", "papel"]`.
- `hoja (árbol)` — dominio `biologia_vegetal`, taxonomy `["biologia", "vegetal", "parte"]`.
- `hoja (cuchillo)` — dominio `herramientas`, taxonomy `["herramientas", "parte"]`.

**Verificar antes de sembrar:** confirmar que no exista ya un `"hoja"` plano sin sufijo en `biologia_vegetal` (un concepto de parte de planta llamado solo "hoja" sin el sufijo de sentido) — si existe, renombrarlo a `hoja (árbol)` en vez de crear un duplicado.

#### 7.7 Coches — marcas y modelos (partículas separadas, actuales + históricos)

Marcas (~55, dominio `transporte`, taxonomy `["transporte", "marca"]`): Toyota, Honda, Ford, Chevrolet, Volkswagen, Nissan, Hyundai, Kia, BMW, Mercedes-Benz, Audi, Mazda, Subaru, Jeep, Ram, GMC, Buick, Chrysler, Dodge, Lincoln, Cadillac, Volvo, Porsche, Land Rover, Jaguar, Mini, Fiat, Peugeot, Renault, Citroën, Škoda, SEAT, Opel, Alfa Romeo, Lancia, Mitsubishi, Suzuki, Isuzu, Lexus, Infiniti, Acura, Genesis, Tesla, Rivian, Lucid Motors, Polestar, BYD, NIO, XPeng, Li Auto, VinFast, Fisker, Ferrari, Lamborghini, Bugatti, Maserati.

Modelos (meta ~300, dominio `transporte`, taxonomy `["transporte", "modelo"]`) — muestra representativa, no exhaustiva; completar por categoría:
- **Sedanes/compactos:** Corolla, Camry, Civic, Accord, Focus, Fusion, Fiesta, Sentra, Altima, Elantra, Sonata, Forte, Optima, Jetta, Passat, Golf, Mazda3, Mazda6, Impreza, Legacy, Serie 3, Serie 5, Clase C, Clase E, A3, A4, A6, Model 3, Model S.
- **SUVs/crossovers:** RAV4, CR-V, Escape, Explorer, Rogue, Tucson, Santa Fe, Sportage, Sorento, Tiguan, Atlas, CX-5, Outback, Forester, X1, X3, X5, GLA, GLC, GLE, Q3, Q5, Q7, Model X, Model Y, Wrangler, Grand Cherokee, Cherokee, Compass, Renegade.
- **Pickups:** F-150, Silverado, Ram 1500, Tundra, Tacoma, Ranger, Colorado, Frontier, Titan, Sierra, Cybertruck, R1T.
- **Deportivos/desempeño:** Mustang, Camaro, Corvette, 911, Cayman, Boxster, GT-R, Supra, MX-5 Miata, WRX STI, Civic Type R, M3, M5, AMG GT, R8, Huracán, Aventador, Chiron, LaFerrari, F8 Tributo.
- **EVs (no Tesla):** Ioniq 5, Ioniq 6, EV6, Bolt EV, Leaf, ID.4, Ariya, e-tron GT, Taycan, Polestar 2, BYD Seal, BYD Atto 3, NIO ET7, Lucid Air, Rivian R1S.
- **Minivans/vans:** Odyssey, Sienna, Pacifica, Grand Caravan, Transit.
- **Íconos históricos/descontinuados:** Ford Model T, Volkswagen Beetle (original), Volkswagen Kombi/Bus (T1), Chevrolet Bel Air, Ford Mustang (original 1964½), Citroën 2CV, Mini Cooper (original, pre-BMW), Fiat 500 (original, 1957), Trabant 601, Willys Jeep (militar original), DeLorean DMC-12, Porsche 356, Chevrolet Corvair, Datsun 240Z, Lancia Delta Integrale, Saab 900, AMC Gremlin, Yugo GV.

Llegar a 300 limpio implica completar cada categoría más (más versiones/generaciones de los mismos modelos, más modelos regionales — ej. Latinoamérica tiene nombres de modelo que no existen en el mercado de EEUU) — este borrador es el esqueleto, no el conteo final.

### 8. Riesgo abierto: longitud del texto enriquecido vs. tokens

Enriquecer el texto de presidentes/bancos (decisión #3) hace que cada entrada sea una cláusula completa en vez de 1–3 palabras — ej. `"Andrés Manuel López Obrador, presidente de México (2018–2024)"` tiene ~11 palabras, notablemente más largo que la norma actual del dataset. Según lo que el usuario mismo señaló ("piensa también en los tokens, no solo en el embedding"), esto tiene dos efectos concretos que vale medir con datos reales, no adivinar ahora:
1. **El conteo de tokens BPE/BGE por concepto sube** — un concepto de persona/banco ahora se tokeniza en muchos más fragmentos de subpalabra que un sustantivo plano, lo cual importa para la UI de modo token en Avanzado (despliegue por fragmento, el tope de 12 fragmentos en `tokenMode.ts`) si alguien escribe el nombre enriquecido completo de un presidente como su frase de prueba.
2. **Densidad de la tarjeta de concepto** — la línea primaria/secundaria `wordEs`/`wordEn` en `vx-concept-card` hoy es un par de palabras corto; una cláusula completa ahí es una pregunta de UI, no solo de datos (puede necesitar un ajuste de layout de tarjeta, ej. mostrar la cláusula enriquecida como línea secundaria y un nombre corto para mostrar como primaria).

Decisión #16: dejar esto como riesgo documentado, resolverlo en la implementación con conteos de tokens reales y una captura de pantalla real de la tarjeta, en vez de un tope de longitud decidido en abstracto ahora.

### 9. Explícitamente diferido (no en esta tanda)

Seleccionado como "no esta vez" al preguntar (§pregunta de pendientes) o no seleccionado en absoluto:
- Más profundidad de dominio programación/tecnología.
- Estados de México / EEUU como entradas propias de subdivisión geográfica.

Quedan en el backlog general hacia la meta de 15,000 (ver memoria `project_vectron.md` / bitácoras previas) para una tanda futura, no esta.

### 10. Impacto de tamaño aproximado

| Categoría | Estimado |
|---|---|
| Presidentes/jefes de estado (100 países, 200 años, exhaustivo) | ~2,500–3,500 |
| Bancos y neobancos globales | ~200 |
| Bancos + SOFIPOs de México | ~90–95 |
| Bancos de EEUU + excepción Granger | ~101 |
| Marcas de coches | ~55 |
| Modelos de coches | ~300 |
| Clima (solo lo faltante) | 5 |
| Palabras espaciales/deícticas | ~12 |
| Polisemia de "hoja" | 3 |
| Top-up de biología (pendiente) | ~150–200 |
| Top-up de mitología (pendiente, hueco real más chico de lo registrado antes) | ~50–80 |
| Modismos/frases hechas (pendiente, dominio nuevo) | ~40–60 |
| Top-up de emociones (pendiente, el dominio ya existe) | ~15–20 |
| **Total de esta tanda** | **~3,500–4,650** |

2,263 actuales + esta tanda ≈ **5,800–6,900**, un paso grande hacia la meta de 15,000 sin pretender llegar en una sola tanda.
