import crypto from "node:crypto";

function b64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export function signToken(payload, secret, expiresInSec = 60 * 60 * 8) {
  const header = { alg: "HS256", typ: "JWT" };
  const body = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + expiresInSec,
  };
  const h = b64url(JSON.stringify(header));
  const p = b64url(JSON.stringify(body));
  const sig = crypto
    .createHmac("sha256", secret)
    .update(`${h}.${p}`)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `${h}.${p}.${sig}`;
}

export function verifyToken(token, secret) {
  if (!token || !secret) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${h}.${p}`)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  const a = Buffer.from(s);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(p.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString());
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getBearer(req) {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

const FALLBACK_SITE_ORIGIN = "https://aseati.vercel.app";

export function getSiteOrigin(req) {
  const fromEnv = process.env.SITE_URL || process.env.CONTACT_ORIGIN;
  if (fromEnv) return String(fromEnv).replace(/\/$/, "");

  const hostHeader = req?.headers?.["x-forwarded-host"] || req?.headers?.host;
  const host = hostHeader?.toString().split(",")[0].trim();
  if (host) {
    const protoHeader = req.headers["x-forwarded-proto"]?.toString().split(",")[0].trim();
    const proto = protoHeader || "https";
    return `${proto}://${host}`;
  }

  return FALLBACK_SITE_ORIGIN;
}

export function json(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(data));
}

export function readBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body != null) {
      if (typeof req.body === "object") return resolve(req.body);
      if (typeof req.body === "string") {
        try {
          return resolve(req.body ? JSON.parse(req.body) : null);
        } catch (error) {
          return reject(error);
        }
      }
    }

    const chunks = [];
    let settled = false;

    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      fn(value);
    };

    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) return finish(resolve, null);
      try {
        finish(resolve, JSON.parse(raw));
      } catch (error) {
        finish(reject, error);
      }
    });
    req.on("error", (error) => finish(reject, error));

    // If the stream already ended with no data events, resolve null soon.
    if (req.readableEnded) {
      finish(resolve, null);
    }
  });
}

export async function githubGetFile(path) {
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";
  const token = process.env.GITHUB_TOKEN;
  if (!repo || !token) throw new Error("Faltan GITHUB_REPO o GITHUB_TOKEN.");

  const url = `https://api.github.com/repos/${repo}/contents/${path}?ref=${encodeURIComponent(branch)}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "aseati-admin",
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub GET falló (${response.status}): ${text}`);
  }
  return response.json();
}

export async function githubPutFile(path, contentBase64, message, sha) {
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";
  const token = process.env.GITHUB_TOKEN;
  if (!repo || !token) throw new Error("Faltan GITHUB_REPO o GITHUB_TOKEN.");

  const url = `https://api.github.com/repos/${repo}/contents/${path}`;
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "aseati-admin",
    },
    body: JSON.stringify({
      message,
      content: contentBase64,
      branch,
      sha,
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub PUT falló (${response.status}): ${text}`);
  }
  return response.json();
}

export async function githubDeleteFile(path, sha, message) {
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";
  const token = process.env.GITHUB_TOKEN;
  if (!repo || !token) throw new Error("Faltan GITHUB_REPO o GITHUB_TOKEN.");

  const url = `https://api.github.com/repos/${repo}/contents/${path}`;
  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "aseati-admin",
    },
    body: JSON.stringify({
      message,
      branch,
      sha,
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub DELETE falló (${response.status}): ${text}`);
  }
  return response.json();
}

export async function githubListFiles(prefixes = ["public/gallery", "public/docs"]) {
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";
  const token = process.env.GITHUB_TOKEN;
  if (!repo || !token) throw new Error("Faltan GITHUB_REPO o GITHUB_TOKEN.");

  const refUrl = `https://api.github.com/repos/${repo}/git/ref/heads/${encodeURIComponent(branch)}`;
  const refRes = await fetch(refUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "aseati-admin",
    },
  });
  if (!refRes.ok) {
    const text = await refRes.text();
    throw new Error(`GitHub REF falló (${refRes.status}): ${text}`);
  }
  const ref = await refRes.json();
  const commitSha = ref.object?.sha;
  if (!commitSha) throw new Error("No se pudo resolver el commit de la rama.");

  const commitUrl = `https://api.github.com/repos/${repo}/git/commits/${commitSha}`;
  const commitRes = await fetch(commitUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "aseati-admin",
    },
  });
  if (!commitRes.ok) {
    const text = await commitRes.text();
    throw new Error(`GitHub COMMIT falló (${commitRes.status}): ${text}`);
  }
  const commit = await commitRes.json();
  const treeSha = commit.tree?.sha;
  if (!treeSha) throw new Error("No se pudo resolver el árbol del repo.");

  const treeUrl = `https://api.github.com/repos/${repo}/git/trees/${treeSha}?recursive=1`;
  const treeRes = await fetch(treeUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "aseati-admin",
    },
  });
  if (!treeRes.ok) {
    const text = await treeRes.text();
    throw new Error(`GitHub TREE falló (${treeRes.status}): ${text}`);
  }
  const tree = await treeRes.json();
  const allowed = Array.isArray(prefixes) ? prefixes : [prefixes];
  return (tree.tree ?? [])
    .filter((item) => item.type === "blob")
    .filter((item) => allowed.some((prefix) => item.path === prefix || item.path.startsWith(`${prefix}/`)))
    .map((item) => ({
      path: item.path,
      url: item.path.replace(/^public/, ""),
      size: item.size ?? 0,
      sha: item.sha,
    }))
    .sort((a, b) => a.path.localeCompare(b.path));
}
