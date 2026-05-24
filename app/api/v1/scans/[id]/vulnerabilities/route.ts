import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/api-middleware";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const claims = await authenticate(req);
  if (claims instanceof NextResponse) return claims;

  const { id } = await params;
  const scanId = parseInt(id, 10);
  if (isNaN(scanId)) return NextResponse.json({ error: "invalid scan id" }, { status: 400 });

  const vulns = await prisma.vulnerability.findMany({ where: { scanId } });
  return NextResponse.json(vulns);
}
