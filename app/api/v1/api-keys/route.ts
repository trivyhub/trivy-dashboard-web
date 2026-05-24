import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate, requireRole } from "@/lib/api-middleware";
import { randomBytes, createHash } from "crypto";

function generateKey() {
  const bytes = randomBytes(32);
  const full = "tvd_" + bytes.toString("hex");
  const prefix = full.slice(0, 10);
  const hash = createHash("sha256").update(full).digest("hex");
  return { full, prefix, hash };
}

export async function GET(req: NextRequest) {
  const claims = await authenticate(req);
  if (claims instanceof NextResponse) return claims;

  const denied = requireRole(claims, "owner", "admin");
  if (denied) return denied;

  const keys = await prisma.apiKey.findMany({
    where: { organizationId: claims.organizationId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(keys);
}

export async function POST(req: NextRequest) {
  const claims = await authenticate(req);
  if (claims instanceof NextResponse) return claims;

  const denied = requireRole(claims, "owner", "admin");
  if (denied) return denied;

  const body = await req.json();
  const { name } = body;
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const { full, prefix, hash } = generateKey();
  const key = await prisma.apiKey.create({
    data: { organizationId: claims.organizationId, name, keyHash: hash, keyPrefix: prefix },
  });

  return NextResponse.json({ ...key, key: full }, { status: 201 });
}
