import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

export interface JWTClaims {
  userId: number;
  organizationId: number;
  email: string;
  role: string;
}

function getSecret() {
  const s = process.env.JWT_SECRET ?? "dev-secret-change-in-prod";
  return new TextEncoder().encode(s);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export function checkPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function generateToken(claims: JWTClaims): Promise<string> {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret());
}

export async function parseToken(token: string): Promise<JWTClaims> {
  const { payload } = await jwtVerify(token, getSecret());
  return payload as unknown as JWTClaims;
}
