# Tělocvik – školní systém evidence výsledků z tělesné výchovy

MVP webová aplikace pro evidenci výsledků žáků z tělesné výchovy – náhrada za
Excel tabulky. Eviduje výsledky atletiky, fyzické zdatnosti, docházku, body a
známky. Žák vidí pouze svá data, učitel zapisuje výsledky svých skupin, admin
spravuje celý systém.

## 1. Popis projektu

- **Atletika** (zvlášť dívky / chlapci): skok z místa, skok daleký, 100 m,
  800 m (dívky) / 1500 m (chlapci), vrh koulí.
- **Fyzická zdatnost**: sedy-lehy, švihadlo (1 min), přesah, plný míč
  (2 kg dívky / 4 kg chlapci).
- **Docházka**: konfigurovatelné kódy (výchozí `a`, `u`, `x`, `n`), automatický
  výpočet procenta účasti.
- **Body a známky** se počítají **výhradně na serveru** podle pravidel uložených
  v databázi. Klient může body zobrazit optimisticky, ale finální hodnota vždy
  přichází ze serveru.

## 2. Použitý stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui (Radix UI)
- MySQL + Prisma ORM
- Zod (validace)
- bcryptjs (hashování hesel)
- Vlastní session systém přes httpOnly cookies (token v DB hashovaný)
- `xlsx` (import Excelů)
- ESLint + Prettier

## 3. Instalace

```bash
npm install
```

## 4. Nastavení `.env.local`

V rootu projektu vytvořte `.env.local` (vzor je v `.env.example`):

```env
DATABASE_URL="mysql://user:password@host:3306/databaze"
AUTH_SECRET="dlouhy-nahodny-secret-minimalne-32-znaku"
APP_URL="http://localhost:3000"
NODE_ENV="development"
```

> **Nikdy necommitujte `.env.local`** ani jiný soubor se skutečnými přístupy.
> Verzovaná je jen šablona `.env.example` s fiktivními hodnotami.

> **Pozor:** heslo v `DATABASE_URL` musí být **URL encoded**. Znaky `+` a `@`
> se zapisují jako `%2B` a `%40`. Heslo `Tajne+Heslo@1` tedy vypadá takto:
>
> ```
> DATABASE_URL="mysql://user:Tajne%2BHeslo%401@host:3306/databaze"
> ```

Připojení k DB používá výhradně `process.env.DATABASE_URL` – žádné přístupy
nejsou natvrdo v kódu.

> **Načítání env pro CLI nástroje:** Next.js načítá `.env.local` automaticky,
> ale Prisma CLI a `tsx` skripty (seed/import) ne. Proto npm skripty
> (`prisma:migrate`, `prisma:push`, `seed`, `import:excel`) používají
> `dotenv-cli` (`dotenv -e .env.local -- …`), aby četly stejný `.env.local`.
> Spouštějte tedy npm skripty, ne holé `npx prisma …` (těm by chyběl env).

### Hostinger – Remote MySQL (důležité)

Hostinger ve výchozím stavu **nepovoluje vzdálené připojení** k MySQL. Pokud
dostáváte `P1000: Authentication failed`, povolte přístup:

1. hPanel → **Databáze → Vzdálené MySQL (Remote MySQL)**.
2. Přidejte IP počítače, ze kterého se připojujete (nebo `%` pro libovolnou IP).
3. Ověřte, že DB uživatel/heslo odpovídají `.env.local`.

## 5. Migrace databáze

```bash
npx prisma generate

# Sdílený hosting (Hostinger) – bez shadow databáze:
npm run prisma:push

# Plnohodnotné migrace (vyžaduje právo vytvořit shadow DB):
npm run prisma:migrate
```

> Na sdíleném hostingu obvykle nemá DB uživatel právo vytvořit shadow databázi,
> kterou `prisma migrate dev` potřebuje. V takovém případě použijte
> `npm run prisma:push`, které schéma nasadí přímo bez shadow DB.

## 6. Seed databáze

```bash
npm run seed
```

Seed založí: docházkové kódy, pravidla známek, disciplíny + bodovací pravidla,
školní rok 2025/2026 se dvěma pololetími a dvě skupiny. Testovací účty přidá
**jen mimo produkci** (`NODE_ENV !== "production"`) – viz sekce 9.

## 7. Spuštění projektu

```bash
npm run dev
```

Aplikace běží na <http://localhost:3000>.

## 8. Import Excel souborů

1. Nahrajte `.xlsx` soubory do složky `/imports`.
2. Spusťte import přes CLI:

   ```bash
   npm run import:excel
   ```

   nebo přes rozhraní učitele `/ucitel/import` (tlačítko **Spustit import**).

- Typ souboru se rozpozná podle názvu: `Atletika*`, `Fyzicka-zdatnost*`,
  `Dochazka*` / `Doch*`.
- Pohlaví podle názvu: `divky` → dívky, `chlapci` → chlapci.
- Ročník podle názvu listu (`3. ročník`) nebo názvu souboru (`3R`).
- Import je **idempotentní** – opakovaný import existující záznamy aktualizuje,
  nevytváří duplicity.
- Body se vždy přepočítají podle pravidel v DB (hodnoty z Excelu nejsou zdrojem
  pravdy), známka podle GradeRule.

**Očekávané sloupce (atletika):** A příjmení, B jméno, C/D skok z místa, E/F skok
daleký, G/H 100 m, I/J 800/1500 m, K/L vrh koulí, M body celkem, N známka.

**Fyzická zdatnost:** A příjmení, B jméno, C/D sedy-lehy, E/F švihadlo, G/H
přesah, I/J plný míč, K body celkem, L známka.

**Docházka:** A žák, B procento účasti, C+ datumy hodin, buňky obsahují kódy.

## 9. Testovací přístupy (POUZE lokální vývoj)

Tyto účty zakládá seed **jen mimo produkci** (`NODE_ENV !== "production"`).
Slouží k vývoji a testování, **nikdy je nepoužívejte na produkci**:

| Role    | E-mail                 | Uživatel | Heslo        |
| ------- | ---------------------- | -------- | ------------ |
| TEACHER | ucitel@telocvik.local  | ucitel   | Ucitel123456 |
| STUDENT | student@telocvik.local | student  | Heslo123.    |

Žákovský účet má vynucenou změnu hesla při prvním přihlášení. Na produkci
seed žádný přihlašovací účet nevytvoří – prvního učitele je nutné založit
zvlášť (viz nasazení).

## 10. Struktura projektu

```
/app
  /prihlaseni                přihlášení
  /zmena-hesla               vynucená změna hesla
  /zak/*                     žák: přehled, atletika, zdatnost, docházka,
                             vývoj, bodování
  /ucitel/*                  učitel (správce): přehled, výsledky (atletika,
                             zdatnost), docházka, žáci (+ hromadné přidání),
                             učitelé, skupiny, školní roky (+ převod),
                             pololetí, bodování, import, historie
/components
  /layout  /ui  /tables  /forms  /dashboard  /teacher  /admin  (interní složka správy)
/lib
  /auth        password, session
  /db          prisma singleton
  /scoring     scoring utility + data disciplín a bodů
  /attendance  výpočet docházky
  /validators  Zod schémata
  /actions     server actions (mutace)
  /data        server read helpery
  /import      logika importu Excelů
  permissions.ts, audit.ts, utils/cn.ts
/prisma         schema.prisma, seed.ts
/scripts        import-excel.ts (CLI)
/imports        sem se nahrávají Excel soubory
```

## 11. Popis rolí

- **TEACHER (učitel)** – hlavní správcovská role. Vidí všechny žáky i skupiny;
  zapisuje a upravuje výkony a docházku (body/známky se přepočítávají
  automaticky) a spravuje uživatele, učitele, skupiny, školní roky, pololetí,
  disciplíny, bodování, pravidla známek, import Excelů a celý audit log.
  Může resetovat hesla a nastavit roli TEACHER nebo STUDENT.
- **STUDENT (žák)** – vidí pouze svůj profil, výsledky, body, známky a docházku;
  nemůže nic upravovat ani vidět ostatní žáky.

## 12. Bezpečnostní poznámky

- Hesla se ukládají hashovaná (bcrypt), nikdy v plaintextu.
- Session token je pouze v **httpOnly** cookie (`sameSite=lax`, `secure`
  v produkci, `path=/`); v DB je uložen pouze jeho SHA-256 hash.
- `Remember me` = 30 dní, jinak 12 hodin.
- Middleware hrubě chrání cesty (existence cookie), detailní ověření role a
  platnosti session probíhá v server layoutech (`requireRole`).
- Oprávnění jsou centralizována v `lib/permissions.ts` (žádné rozházené role
  checky v UI). Student nezíská cizí data přes URL, učitel needituje cizí
  skupiny – ověřuje se i v každé server action.
- Veškerý vstup se validuje přes Zod, Prisma chrání proti SQL injection.
- Při resetu hesla se zneplatní všechny existující session uživatele.
- Každá editace výsledku/docházky i přihlášení/odhlášení a import se zapisuje do
  **AuditLogu**.

## 13. Jak přidat novou disciplínu

1. Přidejte definici do `lib/scoring/disciplines-data.ts` (`ALL_DISCIPLINES`):
   `assessmentType`, `slug`, `gender`, `valueType`, `scoringDirection`, `unit`,
   `sortOrder` a pole `bands` (nepřekrývající se intervaly `[min, max]`, `null`
   = otevřený konec).
2. Spusťte `npm run seed` (upsertne disciplínu i pravidla).
3. Disciplína se automaticky objeví ve výsledkových tabulkách dané kategorie.

Alternativně lze disciplínu/pravidla spravovat v `/ucitel/bodovani`.

## 14. Jak upravit bodování

- Rychle v UI: `/ucitel/bodovani` – upravte body a hranice intervalů jednotlivých
  pravidel.
- Nebo hromadně v `lib/scoring/disciplines-data.ts` a znovu `npm run seed`.

Výpočet probíhá v `lib/scoring/scoring.ts` → `calculatePoints` (najde pravidlo,
jehož interval obsahuje hodnotu).

## 15. Jak změnit pravidla známek

Výchozí pravidla jsou v `DEFAULT_GRADE_RULES` (`lib/scoring/scoring.ts`):

| Body   | Známka |
| ------ | ------ |
| 20+    | 1      |
| 15–19  | 2      |
| 10–14  | 3      |
| 5–9    | 4      |
| 0–4    | 5      |

Změňte hodnoty a spusťte `npm run seed` (přepíše tabulku `GradeRule`), nebo
upravte záznamy `GradeRule` přímo v DB. Výpočet zajišťuje `calculateGrade`.

## Příkazy (package.json)

| Příkaz                  | Popis                          |
| ----------------------- | ------------------------------ |
| `npm run dev`           | vývojový server                |
| `npm run build`         | produkční build                |
| `npm run start`         | spuštění produkčního buildu    |
| `npm run lint`          | ESLint                         |
| `npm run format`        | Prettier                       |
| `npm run seed`          | naplnění DB výchozími daty     |
| `npm run import:excel`  | import Excelů ze `/imports`    |
| `npm run prisma:generate` | generování Prisma klienta    |
| `npm run prisma:migrate`  | migrace databáze             |

## Rychlý start

```bash
npm install
npx prisma generate
npm run prisma:push      # nebo: npm run prisma:migrate (viz sekce 5)
npm run seed
npm run dev
# volitelně: npm run import:excel
```

> Pokud `prisma:push`/`prisma:migrate` selže s `P1000`, povolte vzdálený přístup
> k MySQL (viz sekce 5 – Hostinger Remote MySQL).
