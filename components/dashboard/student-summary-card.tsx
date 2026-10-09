import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GradeBadge } from "@/components/ui/grade-badge";
import { PointsBadge } from "@/components/ui/points-badge";

export function StudentSummaryCard({
  title,
  totalPoints,
  grade,
}: {
  title: string;
  totalPoints: number;
  grade: number | null;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Body:</span>
          <PointsBadge points={totalPoints} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Známka:</span>
          <GradeBadge grade={grade} />
        </div>
      </CardContent>
    </Card>
  );
}
