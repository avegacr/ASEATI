import { getSiteOrigin, json, readBody } from "./_lib.js";

const submissions = new Map();

function getIp(req) {
  return (
    req.headers["x-forwarded-for"]?.toString().split(",")[0].trim() ||
    req.headers["x-real-ip"]?.toString() ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

function isRateLimited(ip) {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const max = 6;
  const entry = submissions.get(ip);
  if (!entry || now - entry.start > windowMs) {
    submissions.set(ip, { count: 1, start: now });
    return false;
  }
  entry.count += 1;
  submissions.set(ip, entry);
  return entry.count > max;
}

function clean(value, max = 400) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .trim()
    .slice(0, max);
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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

function buildEmail({ anonymous, name, email, topic, message }) {
  const mode = anonymous ? "Anónimo" : "Con datos de contacto";
  const subject = `[ASEATI] ${topic} · ${mode}`;
  const lines = [
    `Tipo: ${topic}`,
    `Modalidad: ${mode}`,
    `Nombre: ${anonymous ? "No indicado (envío anónimo)" : name || "No indicado"}`,
    `Correo: ${email || (anonymous ? "No indicado (envío anónimo)" : "No indicado")}`,
    "",
    "Mensaje:",
    message,
  ];
  return { subject, text: lines.join("\n") };
}

async function sendWithWeb3Forms({ subject, text, replyTo, name }) {
  const key = process.env.WEB3FORMS_ACCESS_KEY;
  if (!key) return { ok: false, skipped: true };

  const response = await fetch("https://api.web3forms.com/submit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      access_key: key,
      subject,
      from_name: "Buzón ASEATI",
      name: name || "Buzón ASEATI",
      email: replyTo || "aseati@estudiantec.cr",
      replyto: replyTo || undefined,
      message: text,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success !== true) {
    throw new Error(data.message || `Web3Forms falló (${response.status}).`);
  }
  return { ok: true };
}

async function sendWithResend({ to, subject, text }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, skipped: true };

  const from = process.env.CONTACT_FROM_EMAIL || "ASEATI <onboarding@resend.dev>";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Resend falló (${response.status}): ${detail}`);
  }
  return { ok: true };
}

async function sendWithFormSubmit({ to, subject, text, replyTo, req }) {
  const origin = getSiteOrigin(req);
  const host = new URL(origin).hostname;
  const response = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(to)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Origin: origin,
      Referer: `${origin}/`,
    },
    body: JSON.stringify({
      _subject: subject,
      _template: "box",
      _captcha: "false",
      name: "Buzón ASEATI",
      email: replyTo || `consultas@${host}`,
      message: text,
    }),
  });

  const raw = await response.text();
  let data = {};
  try {
    data = JSON.parse(raw);
  } catch {
    data = { message: raw };
  }

  const message = String(data.message || "");
  const needsActivation = /activat/i.test(message);
  const success = data.success === true || data.success === "true";

  if (needsActivation) {
    return { ok: false, activate: true };
  }
  if (!response.ok || !success) {
    throw new Error(message || `FormSubmit falló (${response.status}).`);
  }
  return { ok: true, activate: false };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }

  if (req.method !== "POST") {
    return json(res, 405, { error: "Método no permitido." });
  }

  const ip = getIp(req);
  if (isRateLimited(ip)) {
    return json(res, 429, { error: "Hay muchos envíos seguidos. Probá de nuevo en unos minutos." });
  }

  try {
    const body = await parseBody(req);
    if (clean(body?.website, 80)) {
      return json(res, 200, { ok: true });
    }

    const anonymous = Boolean(body?.anonymous);
    const name = clean(body?.name, 120);
    const email = clean(body?.email, 160).toLowerCase();
    const topic = clean(body?.topic, 80) || "Consulta";
    const message = clean(body?.message, 4000);

    if (message.length < 10) {
      return json(res, 400, { error: "El mensaje es muy corto. Contanos un poco más." });
    }
    if (!anonymous && !name) {
      return json(res, 400, { error: "Indicá tu nombre o enviá el mensaje de forma anónima." });
    }
    if (email && !isEmail(email)) {
      return json(res, 400, { error: "El correo no tiene un formato válido." });
    }

    const to = process.env.CONTACT_TO_EMAIL || "aseati@estudiantec.cr";
    const emailPayload = buildEmail({ anonymous, name, email, topic, message });

    const web3 = await sendWithWeb3Forms({
      ...emailPayload,
      replyTo: email || undefined,
      name: anonymous ? "Estudiante anónimo" : name,
    });
    if (!web3.ok) {
      const resend = await sendWithResend({ to, ...emailPayload });
      if (!resend.ok) {
        const submitted = await sendWithFormSubmit({
          to,
          ...emailPayload,
          replyTo: email || undefined,
          req,
        });
        if (submitted.activate) {
          return json(res, 503, {
            error:
              "El buzón todavía necesita activarse. La Junta debe abrir el correo de FormSubmit en aseati@estudiantec.cr y confirmar el enlace.",
          });
        }
        if (!submitted.ok) {
          throw new Error("No hay un servicio de correo configurado.");
        }
      }
    }

    return json(res, 200, {
      ok: true,
      message: "Tu mensaje ya se envió a ASEATI. Gracias por escribirnos.",
    });
  } catch (error) {
    return json(res, 500, {
      error: "No se pudo enviar el mensaje. Intentá de nuevo o escribinos a aseati@estudiantec.cr.",
      detail: process.env.NODE_ENV === "development" ? String(error.message || error) : undefined,
    });
  }
}
