import type {
  AssessmentType,
  Gender,
  ScoringDirection,
  ValueType,
} from "@prisma/client";

/**
 * Definice disciplín a bodovacích pravidel dle zadání.
 * Pravidla jsou nepřekrývající se intervaly [min, max] (null = otevřený konec).
 * Časy (běh) jsou v SEKUNDÁCH. Tato data slouží pro seed i pro výpočet bodů.
 *
 * Jak přidat disciplínu / upravit bodování: viz README.
 */

export type Band = { points: number; min: number | null; max: number | null };

export type DisciplineDef = {
  assessmentType: AssessmentType;
  name: string;
  slug: string;
  gender: Gender;
  valueType: ValueType;
  scoringDirection: ScoringDirection;
  unit: string | null;
  sortOrder: number;
  bands: Band[];
};

const b = (points: number, min: number | null, max: number | null): Band => ({
  points,
  min,
  max,
});

// ---------------------------------------------------------------------------
// ATLETIKA – DÍVKY
// ---------------------------------------------------------------------------
const athleticsGirls: DisciplineDef[] = [
  {
    assessmentType: "ATHLETICS",
    name: "Skok z místa",
    slug: "skok-z-mista",
    gender: "GIRLS",
    valueType: "NUMBER",
    scoringDirection: "HIGHER_IS_BETTER",
    unit: "cm",
    sortOrder: 1,
    bands: [
      b(10, 222, null),
      b(9, 213, 221),
      b(8, 204, 212),
      b(7, 195, 203),
      b(6, 186, 194),
      b(5, 177, 185),
      b(4, 168, 176),
      b(3, 159, 167),
      b(2, 150, 158),
      b(1, 141, 149),
      b(0, null, 140),
    ],
  },
  {
    assessmentType: "ATHLETICS",
    name: "Skok daleký",
    slug: "skok-daleky",
    gender: "GIRLS",
    valueType: "NUMBER",
    scoringDirection: "HIGHER_IS_BETTER",
    unit: "cm",
    sortOrder: 2,
    bands: [
      b(10, 410, null),
      b(9, 390, 409),
      b(8, 370, 389),
      b(7, 350, 369),
      b(6, 330, 349),
      b(5, 310, 329),
      b(4, 290, 309),
      b(3, 270, 289),
      b(2, 250, 269),
      b(1, 230, 249),
      b(0, null, 229),
    ],
  },
  {
    assessmentType: "ATHLETICS",
    name: "100 m",
    slug: "beh-100m",
    gender: "GIRLS",
    valueType: "NUMBER",
    scoringDirection: "LOWER_IS_BETTER",
    unit: "s",
    sortOrder: 3,
    bands: [
      b(10, null, 15.2),
      b(9, 15.21, 15.8),
      b(8, 15.81, 16.4),
      b(7, 16.41, 17.0),
      b(6, 17.01, 17.6),
      b(5, 17.61, 18.2),
      b(4, 18.21, 18.8),
      b(3, 18.81, 19.4),
      b(2, 19.41, 20.0),
      b(1, 20.01, 20.6),
      b(0, 20.61, null),
    ],
  },
  {
    assessmentType: "ATHLETICS",
    name: "800 m",
    slug: "beh-vytrvalost",
    gender: "GIRLS",
    valueType: "TIME_SECONDS",
    scoringDirection: "LOWER_IS_BETTER",
    unit: "min",
    sortOrder: 4,
    bands: [
      b(10, null, 200), // do 3:20
      b(9, 201, 210), // 3:21–3:30
      b(8, 211, 220),
      b(7, 221, 230),
      b(6, 231, 240),
      b(5, 241, 250),
      b(4, 251, 260),
      b(3, 261, 270),
      b(2, 271, 280),
      b(1, 281, 540), // 4:41–9:00
      b(0, 541, null), // nad 9:00
    ],
  },
  {
    assessmentType: "ATHLETICS",
    name: "Vrh koulí",
    slug: "vrh-kouli",
    gender: "GIRLS",
    valueType: "NUMBER",
    scoringDirection: "HIGHER_IS_BETTER",
    unit: "cm",
    sortOrder: 5,
    bands: [
      b(10, 850, null),
      b(9, 800, 849),
      b(8, 750, 799),
      b(7, 700, 749),
      b(6, 650, 699),
      b(5, 600, 649),
      b(4, 550, 599),
      b(3, 500, 549),
      b(2, 450, 499),
      b(1, 400, 449),
      b(0, null, 399),
    ],
  },
];

// ---------------------------------------------------------------------------
// ATLETIKA – CHLAPCI
// ---------------------------------------------------------------------------
const athleticsBoys: DisciplineDef[] = [
  {
    assessmentType: "ATHLETICS",
    name: "Skok z místa",
    slug: "skok-z-mista",
    gender: "BOYS",
    valueType: "NUMBER",
    scoringDirection: "HIGHER_IS_BETTER",
    unit: "cm",
    sortOrder: 1,
    bands: [
      b(10, 252, null),
      b(9, 243, 251),
      b(8, 234, 242),
      b(7, 225, 233),
      b(6, 216, 224),
      b(5, 207, 215),
      b(4, 198, 206),
      b(3, 189, 197),
      b(2, 180, 188),
      b(1, 171, 179),
      b(0, null, 170),
    ],
  },
  {
    assessmentType: "ATHLETICS",
    name: "Skok daleký",
    slug: "skok-daleky",
    gender: "BOYS",
    valueType: "NUMBER",
    scoringDirection: "HIGHER_IS_BETTER",
    unit: "cm",
    sortOrder: 2,
    bands: [
      b(10, 525, null),
      b(9, 500, 524),
      b(8, 475, 499),
      b(7, 450, 474),
      b(6, 425, 449),
      b(5, 400, 424),
      b(4, 375, 399),
      b(3, 350, 374),
      b(2, 325, 349),
      b(1, 300, 324),
      b(0, null, 299),
    ],
  },
  {
    assessmentType: "ATHLETICS",
    name: "100 m",
    slug: "beh-100m",
    gender: "BOYS",
    valueType: "NUMBER",
    scoringDirection: "LOWER_IS_BETTER",
    unit: "s",
    sortOrder: 3,
    bands: [
      b(10, null, 13.0),
      b(9, 13.01, 13.5),
      b(8, 13.51, 14.0),
      b(7, 14.01, 14.5),
      b(6, 14.51, 15.0),
      b(5, 15.01, 15.5),
      b(4, 15.51, 16.0),
      b(3, 16.01, 16.5),
      b(2, 16.51, 17.0),
      b(1, 17.01, 17.5),
      b(0, 17.51, null),
    ],
  },
  {
    assessmentType: "ATHLETICS",
    name: "1500 m",
    slug: "beh-vytrvalost",
    gender: "BOYS",
    valueType: "TIME_SECONDS",
    scoringDirection: "LOWER_IS_BETTER",
    unit: "min",
    sortOrder: 4,
    bands: [
      b(10, null, 330), // do 5:30
      b(9, 331, 345),
      b(8, 346, 360),
      b(7, 361, 375),
      b(6, 376, 390),
      b(5, 391, 405),
      b(4, 406, 420),
      b(3, 421, 435),
      b(2, 436, 450),
      b(1, 451, 960), // 7:31–16:00
      b(0, 961, null), // nad 16:00
    ],
  },
  {
    assessmentType: "ATHLETICS",
    name: "Vrh koulí",
    slug: "vrh-kouli",
    gender: "BOYS",
    valueType: "NUMBER",
    scoringDirection: "HIGHER_IS_BETTER",
    unit: "cm",
    sortOrder: 5,
    bands: [
      b(10, 930, null),
      b(9, 880, 929),
      b(8, 830, 879),
      b(7, 780, 829),
      b(6, 730, 779),
      b(5, 680, 729),
      b(4, 630, 679),
      b(3, 580, 629),
      b(2, 530, 579),
      b(1, 480, 529),
      b(0, null, 479),
    ],
  },
];

// Sedy-lehy a švihadlo a přesah jsou stejné pro dívky i chlapce.
const sitUpsBands = [
  b(10, 56, null),
  b(9, 52, 55),
  b(8, 48, 51),
  b(7, 44, 47),
  b(6, 40, 43),
  b(5, 36, 39),
  b(4, 32, 35),
  b(3, 28, 31),
  b(2, 24, 27),
  b(1, 20, 23),
  b(0, null, 19),
];

const ropeBands = [
  b(10, 166, null),
  b(9, 151, 165),
  b(8, 136, 150),
  b(7, 121, 135),
  b(6, 106, 120),
  b(5, 91, 105),
  b(4, 76, 90),
  b(3, 61, 75),
  b(2, 46, 60),
  b(1, 31, 45),
  b(0, null, 30),
];

const reachBands = [
  b(10, null, -21),
  b(9, -20, -18),
  b(8, -17, -15),
  b(7, -14, -12),
  b(6, -11, -9),
  b(5, -8, -6),
  b(4, -5, -3),
  b(3, -2, 0),
  b(2, 1, 3),
  b(1, 4, 6),
  b(0, 7, null),
];

// ---------------------------------------------------------------------------
// FYZICKÁ ZDATNOST – DÍVKY
// ---------------------------------------------------------------------------
const fitnessGirls: DisciplineDef[] = [
  {
    assessmentType: "FITNESS",
    name: "Sedy-lehy",
    slug: "sedy-lehy",
    gender: "GIRLS",
    valueType: "NUMBER",
    scoringDirection: "HIGHER_IS_BETTER",
    unit: "počet",
    sortOrder: 1,
    bands: sitUpsBands,
  },
  {
    assessmentType: "FITNESS",
    name: "Švihadlo (1 min)",
    slug: "svihadlo",
    gender: "GIRLS",
    valueType: "NUMBER",
    scoringDirection: "HIGHER_IS_BETTER",
    unit: "počet",
    sortOrder: 2,
    bands: ropeBands,
  },
  {
    assessmentType: "FITNESS",
    name: "Přesah",
    slug: "presah",
    gender: "GIRLS",
    valueType: "NUMBER",
    scoringDirection: "LOWER_IS_BETTER",
    unit: "cm",
    sortOrder: 3,
    bands: reachBands,
  },
  {
    assessmentType: "FITNESS",
    name: "Plný míč 2 kg",
    slug: "plny-mic",
    gender: "GIRLS",
    valueType: "NUMBER",
    scoringDirection: "HIGHER_IS_BETTER",
    unit: "cm",
    sortOrder: 4,
    bands: [
      b(10, 896, null),
      b(9, 831, 895),
      b(8, 771, 830),
      b(7, 706, 770),
      b(6, 641, 705),
      b(5, 576, 640),
      b(4, 511, 575),
      b(3, 451, 510),
      b(2, 386, 450),
      b(1, 320, 385),
      b(0, null, 319),
    ],
  },
];

// ---------------------------------------------------------------------------
// FYZICKÁ ZDATNOST – CHLAPCI
// ---------------------------------------------------------------------------
const fitnessBoys: DisciplineDef[] = [
  {
    assessmentType: "FITNESS",
    name: "Sedy-lehy",
    slug: "sedy-lehy",
    gender: "BOYS",
    valueType: "NUMBER",
    scoringDirection: "HIGHER_IS_BETTER",
    unit: "počet",
    sortOrder: 1,
    bands: sitUpsBands,
  },
  {
    assessmentType: "FITNESS",
    name: "Švihadlo (1 min)",
    slug: "svihadlo",
    gender: "BOYS",
    valueType: "NUMBER",
    scoringDirection: "HIGHER_IS_BETTER",
    unit: "počet",
    sortOrder: 2,
    bands: ropeBands,
  },
  {
    assessmentType: "FITNESS",
    name: "Přesah",
    slug: "presah",
    gender: "BOYS",
    valueType: "NUMBER",
    scoringDirection: "LOWER_IS_BETTER",
    unit: "cm",
    sortOrder: 3,
    bands: reachBands,
  },
  {
    assessmentType: "FITNESS",
    name: "Plný míč 4 kg",
    slug: "plny-mic",
    gender: "BOYS",
    valueType: "NUMBER",
    scoringDirection: "HIGHER_IS_BETTER",
    unit: "cm",
    sortOrder: 4,
    bands: [
      b(10, 976, null),
      b(9, 911, 975),
      b(8, 851, 910),
      b(7, 786, 850),
      b(6, 721, 785),
      b(5, 656, 720),
      b(4, 591, 655),
      b(3, 531, 590),
      b(2, 466, 530),
      b(1, 400, 465),
      b(0, null, 399),
    ],
  },
];

export const ALL_DISCIPLINES: DisciplineDef[] = [
  ...athleticsGirls,
  ...athleticsBoys,
  ...fitnessGirls,
  ...fitnessBoys,
];

/** Slug běžecké (vytrvalostní) disciplíny – sloupec I/J v Excelu. */
export const ENDURANCE_RUN_SLUG = "beh-vytrvalost";

/** Pořadí slugů dle sloupců v Excelu (atletika). */
export const ATHLETICS_COLUMN_SLUGS = [
  "skok-z-mista",
  "skok-daleky",
  "beh-100m",
  "beh-vytrvalost",
  "vrh-kouli",
];

/** Pořadí slugů dle sloupců v Excelu (fyzická zdatnost). */
export const FITNESS_COLUMN_SLUGS = [
  "sedy-lehy",
  "svihadlo",
  "presah",
  "plny-mic",
];
