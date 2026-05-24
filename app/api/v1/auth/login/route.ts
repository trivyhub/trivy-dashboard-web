import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkPassword, generateToken } from "@/lib/server-auth";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json({ error: "email and password required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await checkPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
  }

  const token = await generateToken({
    userId: user.id,
    organizationId: user.organizationId,
    email: user.email,
    role: user.role,
  });

  const { passwordHash: _, ...safeUser } = user;
  return NextResponse.json({ token, user: safeUser });
}
