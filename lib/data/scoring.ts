import "server-only";

import { prisma } from "@/lib/db/prisma";

/** Disciplíny s jejich bodovacími pravidly (pro /ucitel/bodovani – editace). */
export async function getDisciplinesWithRules() {
  const disciplines = await prisma.discipline.findMany({
    orderBy: [{ assessmentType: "asc" }, { gender: "asc" }, { sortOrder: "asc" }],
    include: {
      scoringRules: { orderBy: { points: "desc" } },
    },
  });
  return disciplines;
}

export type ScoringReference = {
  disciplines: {
    id: string;
    name: string;
    assessmentType: string;
    gender: string;
    valueType: string;
    scoringDirection: string;
    unit: string | null;
    sortOrder: number;
    rules: { points: number; minValue: number | null; maxValue: number | null }[];
  }[];
  gradeRules: {
    assessmentType: string;
    minPoints: number;
    maxPoints: number;
    grade: number;
  }[];
};

/**
 * Kompletní přehled bodovacích pravidel + pravidel známkování pro read-only
 * tabulky hodnocení (student / učitel / admin). Data čistě z DB.
 */
export async function getScoringReference(): Promise<ScoringReference> {
  const [disciplines, gradeRules] = await Promise.all([
    prisma.discipline.findMany({
      where: { isActive: true },
      orderBy: [
        { assessmentType: "asc" },
        { gender: "asc" },
        { sortOrder: "asc" },
      ],
      include: { scoringRules: { orderBy: { points: "desc" } } },
    }),
    prisma.gradeRule.findMany({ orderBy: { grade: "asc" } }),
  ]);

  return {
    disciplines: disciplines.map((d) => ({
      id: d.id,
      name: d.name,
      assessmentType: d.assessmentType,
      gender: d.gender,
      valueType: d.valueType,
      scoringDirection: d.scoringDirection,
      unit: d.unit,
      sortOrder: d.sortOrder,
      rules: d.scoringRules.map((r) => ({
        points: r.points,
        minValue: r.minValue,
        maxValue: r.maxValue,
      })),
    })),
    gradeRules: gradeRules.map((g) => ({
      assessmentType: g.assessmentType,
      minPoints: g.minPoints,
      maxPoints: g.maxPoints,
      grade: g.grade,
    })),
  };
}
