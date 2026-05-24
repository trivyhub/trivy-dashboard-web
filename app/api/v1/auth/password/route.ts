import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkPassword, hashPassword } from "@/lib/server-auth";
import { authenticate } from "@/lib/api-middleware";

export async function PUT(req: NextRequest) {
  const claims = await authenticate(req);
  if (claims instanceof NextResponse) return claims;

  const body = await req.json();
  const { current_password, new_password } = body;

  if (!current_password || !new_password || new_password.length < 8) {
    return NextResponse.json({ error: "current_password and new_password (min 8) required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: claims.email } });
  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

  if (!(await checkPassword(current_password, user.passwordHash))) {
    return NextResponse.json({ error: "invalid current password" }, { status: 401 });
  }

  const hash = await hashPassword(new_password);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hash } });
  return NextResponse.json({ message: "password updated" });
}
