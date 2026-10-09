import { requireRole } from "@/lib/auth/session";
import { PageHeader } from "@/components/layout/page-header";
import { ScoringRulesView } from "@/components/scoring/scoring-rules-view";
import { getScoringReference } from "@/lib/data/scoring";

export default async function StudentScoring() {
  await requireRole("STUDENT");
  const data = await getScoringReference();

  return (
    <div>
      <PageHeader
        title="Hodnocení"
        description="Kolik bodů získáš za jaký výkon a jak se z bodů počítá známka."
      />
      <ScoringRulesView data={data} />
    </div>
  );
}
