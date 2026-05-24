import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, generateToken } from "@/lib/server-auth";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { org_name, email, password } = body;

  if (!org_name || !email || !password || password.length < 8) {
    return NextResponse.json({ error: "org_name, email, and password (min 8) required" }, { status: 400 });
  }

  try {
    const org = await prisma.organization.create({ data: { name: org_name } });
    const hash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { organizationId: org.id, email, passwordHash: hash, role: "owner" },
    });
    const token = await generateToken({
      userId: user.id,
      organizationId: org.id,
      email: user.email,
      role: user.role,
    });
    const { passwordHash: _, ...safeUser } = user;
    return NextResponse.json({ token, user: safeUser }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "organization name or email already taken" }, { status: 409 });
  }
}
