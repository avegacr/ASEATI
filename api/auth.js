import { json, readBody, signToken } from "./_lib.js";

const attempts = new Map();

function getIp(req) {
  return (
    req.headers["x-forwarded-for"]?.toString().split(",")[0].trim() ||
    req.headers["x-real-ip"]?.toString() ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

function registerFailure(ip) {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const entry = attempts.get(ip) || { count: 0, start: now };
  if (now - entry.start > windowMs) {
    attempts.set(ip, { count: 1, start: now });
    return false;
  }
  entry.count += 1;
  attempts.set(ip, entry);
  return entry.count > 20;
}

function isBlocked(ip) {
  const entry = attempts.get(ip);
  if (!entry) return false;
  const windowMs = 15 * 60 * 1000;
  if (Date.now() - entry.start > windowMs) {
    attempts.delete(ip);
    return false;
  }
  return entry.count > 20;
}

function clearFailures(ip) {
  attempts.delete(ip);
}

async function parseBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string" && req.body) {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }
  return readBody(req);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }

  if (req.method !== "POST") {
    return json(res, 405, { error: "Método no permitido." });
  }

  const ip = getIp(req);
  if (isBlocked(ip)) {
    return json(res, 429, { error: "Demasiados intentos. Probá más tarde." });
  }

  try {
    const body = await parseBody(req);
    const password = String(body?.password ?? "");
    const expected = String(process.env.ADMIN_PASSWORD || "");
    const secret = String(process.env.ADMIN_SECRET || "");

    if (!expected || !secret) {
      return json(res, 500, {
        error: "El panel admin no está configurado (faltan variables de entorno).",
      });
    }

    if (!password || password !== expected) {
      registerFailure(ip);
      return json(res, 401, { error: "Contraseña incorrecta." });
    }

    clearFailures(ip);
    const token = signToken({ role: "admin" }, secret);
    return json(res, 200, { token, expiresIn: 60 * 60 * 8 });
  } catch (error) {
    return json(res, 400, {
      error: "Solicitud inválida.",
      detail: error?.message || undefined,
    });
  }
}
