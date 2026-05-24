import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/api-middleware";

export async function GET(req: NextRequest) {
  const claims = await authenticate(req);
  if (claims instanceof NextResponse) return claims;

  const user = await prisma.user.findUnique({ where: { email: claims.email } });
  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

  const { passwordHash: _, ...safeUser } = user;
  return NextResponse.json(safeUser);
}
