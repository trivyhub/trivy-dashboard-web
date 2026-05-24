import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate, requireRole } from "@/lib/api-middleware";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const claims = await authenticate(req);
  if (claims instanceof NextResponse) return claims;

  const denied = requireRole(claims, "owner");
  if (denied) return denied;

  const { id } = await params;
  const memberId = parseInt(id, 10);
  if (isNaN(memberId)) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const body = await req.json();
  const { role } = body;

  if (!["admin", "member", "viewer"].includes(role)) {
    return NextResponse.json({ error: "invalid role" }, { status: 400 });
  }

  await prisma.user.updateMany({
    where: { id: memberId, organizationId: claims.organizationId },
    data: { role },
  });

  return NextResponse.json({ message: "role updated" });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const claims = await authenticate(req);
  if (claims instanceof NextResponse) return claims;

  const denied = requireRole(claims, "owner");
  if (denied) return denied;

  const { id } = await params;
  const memberId = parseInt(id, 10);
  if (isNaN(memberId)) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  if (memberId === claims.userId) {
    return NextResponse.json({ error: "cannot remove yourself" }, { status: 400 });
  }

  await prisma.user.deleteMany({
    where: { id: memberId, organizationId: claims.organizationId, role: { not: "owner" } },
  });

  return NextResponse.json({ message: "member removed" });
}
