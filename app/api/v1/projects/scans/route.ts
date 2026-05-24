import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/api-middleware";

export async function GET(req: NextRequest) {
  const claims = await authenticate(req);
  if (claims instanceof NextResponse) return claims;

  const name = new URL(req.url).searchParams.get("name");
  if (!name) return NextResponse.json({ error: "name query param required" }, { status: 400 });

  const project = await prisma.project.findFirst({
    where: { organizationId: claims.organizationId, name },
  });
  if (!project) return NextResponse.json({ error: "project not found" }, { status: 404 });

  const scans = await prisma.scan.findMany({
    where: { projectId: project.id },
    orderBy: { scannedAt: "desc" },
    include: { vulnerabilities: { select: { severity: true } } },
  });

  const result = scans.map((s) => ({
    id: s.id,
    project_id: s.projectId,
    image_name: s.imageName,
    image_digest: s.imageDigest,
    scanned_at: s.scannedAt,
    pipeline_id: s.pipelineId,
    pipeline_url: s.pipelineUrl,
    branch: s.branch,
    commit: s.commit,
    triggered_by: s.triggeredBy,
    langs: JSON.parse(s.langs || "[]"),
    critical: s.vulnerabilities.filter((v) => v.severity === "CRITICAL").length,
    high: s.vulnerabilities.filter((v) => v.severity === "HIGH").length,
    medium: s.vulnerabilities.filter((v) => v.severity === "MEDIUM").length,
    low: s.vulnerabilities.filter((v) => v.severity === "LOW").length,
    total: s.vulnerabilities.length,
  }));

  return NextResponse.json(result);
}
