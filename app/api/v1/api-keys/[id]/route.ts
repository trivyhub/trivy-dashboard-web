import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate, requireRole } from "@/lib/api-middleware";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const claims = await authenticate(req);
  if (claims instanceof NextResponse) return claims;

  const denied = requireRole(claims, "owner", "admin");
  if (denied) return denied;

  const { id } = await params;
  const keyId = parseInt(id, 10);
  if (isNaN(keyId)) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  await prisma.apiKey.updateMany({
    where: { id: keyId, organizationId: claims.organizationId },
    data: { revoked: true },
  });

  return NextResponse.json({ message: `key ${keyId} revoked` });
}
