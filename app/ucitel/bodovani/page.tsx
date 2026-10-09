import { requireRole } from "@/lib/auth/session";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScoringClient } from "@/components/admin/scoring-client";
import { ScoringRulesView } from "@/components/scoring/scoring-rules-view";
import { getDisciplinesWithRules, getScoringReference } from "@/lib/data/scoring";

export default async function TeacherScoring() {
  await requireRole("TEACHER");
  const [disciplines, reference] = await Promise.all([
    getDisciplinesWithRules(),
    getScoringReference(),
  ]);

  return (
    <div>
      <PageHeader
        title="Hodnocení"
        description="Přehled a úprava bodovacích pravidel a pravidel známkování."
      />
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Přehled</TabsTrigger>
          <TabsTrigger value="edit">Úprava pravidel</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <ScoringRulesView data={reference} />
        </TabsContent>
        <TabsContent value="edit" className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Prázdné pole = otevřený interval. Po úpravě se body přepočítají při
            příští změně výkonu.
          </p>
          <ScoringClient
            disciplines={disciplines.map((d) => ({
              id: d.id,
              name: d.name,
              assessmentType: d.assessmentType,
              gender: d.gender,
              unit: d.unit,
              valueType: d.valueType,
              rules: d.scoringRules.map((r) => ({
                id: r.id,
                points: r.points,
                minValue: r.minValue,
                maxValue: r.maxValue,
              })),
            }))}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
