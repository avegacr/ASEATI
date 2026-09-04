import { json, readBody, signToken } from "./_lib.js";

const attempts = new Map();

function tooManyAttempts(ip) {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const entry = attempts.get(ip) || { count: 0, start: now };
  if (now - entry.start > windowMs) {
    attempts.set(ip, { count: 1, start: now });
    return false;
  }
  entry.count += 1;
  attempts.set(ip, entry);
  return entry.count > 12;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return json(res, 405, { error: "Método no permitido." });
  }

  const ip =
    req.headers["x-forwarded-for"]?.toString().split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    "unknown";

  if (tooManyAttempts(ip)) {
    return json(res, 429, { error: "Demasiados intentos. Probá más tarde." });
  }

  try {
    const body = await readBody(req);
    const password = body?.password ?? "";
    const expected = process.env.ADMIN_PASSWORD || "";
    const secret = process.env.ADMIN_SECRET || "";

    if (!expected || !secret) {
      return json(res, 500, {
        error: "El panel admin no está configurado (faltan variables de entorno).",
      });
    }

    if (password !== expected) {
      return json(res, 401, { error: "Contraseña incorrecta." });
    }

    const token = signToken({ role: "admin" }, secret);
    return json(res, 200, { token, expiresIn: 60 * 60 * 8 });
  } catch {
    return json(res, 400, { error: "Solicitud inválida." });
  }
}
