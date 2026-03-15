import crypto from "node:crypto";

export function verifyAtlasSignature(args: {
  body: string;
  signature: string | null;
  timestamp: string | null;
}) {
  const secret = process.env.ATLAS_SHARED_SECRET?.trim();
  if (!secret) {
    throw new Error("ATLAS_SHARED_SECRET no configurado.");
  }
  if (!args.signature || !args.timestamp) {
    throw new Error("Faltan headers de autenticacion Atlas.");
  }

  const ageMs = Math.abs(Date.now() - Date.parse(args.timestamp));
  if (!Number.isFinite(ageMs) || ageMs > 5 * 60_000) {
    throw new Error("Timestamp Atlas invalido o expirado.");
  }

  const expected = crypto.createHmac("sha256", secret).update(`${args.timestamp}.${args.body}`).digest("hex");
  const matches =
    expected.length === args.signature.length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(args.signature));
  if (!matches) {
    throw new Error("Firma Atlas invalida.");
  }
}
