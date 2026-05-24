import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { parseToken, JWTClaims } from "./server-auth";
import { prisma } from "./prisma";

export async function authenticate(req: NextRequest): Promise<JWTClaims | NextResponse> {
  const header = req.headers.get("authorization") ?? "";

  if (header.startsWith("Bearer ")) {
    const token = header.slice(7);
    try {
      return await parseToken(token);
    } catch {
      return NextResponse.json({ error: "invalid token" }, { status: 401 });
    }
  }

  if (header.startsWith("ApiKey ")) {
    const rawKey = header.slice(7);
    const hash = createHash("sha256").update(rawKey).digest("hex");
    const apiKey = await prisma.apiKey.findFirst({
      where: { keyHash: hash, revoked: false },
    });
    if (!apiKey) {
      return NextResponse.json({ error: "invalid api key" }, { status: 401 });
    }
    prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
    return {
      userId: 0,
      organizationId: apiKey.organizationId,
      email: "",
      role: "member",
    };
  }

  return NextResponse.json({ error: "missing authorization" }, { status: 401 });
}

export function requireRole(claims: JWTClaims, ...roles: string[]): NextResponse | null {
  if (!roles.includes(claims.role)) {
    return NextResponse.json({ error: "insufficient permissions" }, { status: 403 });
  }
  return null;
}
