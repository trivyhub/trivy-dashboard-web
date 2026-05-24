import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/api-middleware";

export async function GET(req: NextRequest) {
  const claims = await authenticate(req);
  if (claims instanceof NextResponse) return claims;

  const projects = await prisma.project.findMany({
    where: { organizationId: claims.organizationId },
    orderBy: { name: "asc" },
    include: {
      scans: {
        orderBy: { scannedAt: "desc" },
        take: 1,
        select: {
          scannedAt: true,
          vulnerabilities: {
            select: { severity: true },
          },
        },
      },
      _count: { select: { scans: true } },
    },
  });

  const summaries = projects.map((p) => {
    const lastScan = p.scans[0] ?? null;
    const vulns = lastScan?.vulnerabilities ?? [];
    return {
      id: p.id,
      organization_id: p.organizationId,
      name: p.name,
      environment: p.environment,
      owner: p.owner,
      created_at: p.createdAt,
      last_scan: lastScan?.scannedAt ?? null,
      total_scans: p._count.scans,
      critical: vulns.filter((v) => v.severity === "CRITICAL").length,
      high: vulns.filter((v) => v.severity === "HIGH").length,
      medium: vulns.filter((v) => v.severity === "MEDIUM").length,
      low: vulns.filter((v) => v.severity === "LOW").length,
    };
  });

  return NextResponse.json(summaries);
}
