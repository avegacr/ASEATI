import {
  getBearer,
  githubGetFile,
  githubPutFile,
  json,
  readBody,
  verifyToken,
} from "./_lib.js";

const CONTENT_PATH = "public/data/site.json";

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const file = await githubGetFile(CONTENT_PATH);
      const decoded = Buffer.from(file.content.replace(/\n/g, ""), "base64").toString("utf8");
      return json(res, 200, {
        content: JSON.parse(decoded),
        sha: file.sha,
      });
    } catch (error) {
      // Fallback: allow reading committed public file via relative fetch isn't available server-side.
      // If GitHub fails (e.g. local), return error so admin can still explain config.
      return json(res, 500, { error: error.message || "No se pudo leer el contenido." });
    }
  }

  if (req.method === "PUT") {
    const secret = process.env.ADMIN_SECRET || "";
    const payload = verifyToken(getBearer(req), secret);
    if (!payload) {
      return json(res, 401, { error: "Sesión inválida o expirada. Volvé a iniciar sesión." });
    }

    try {
      const body = await readBody(req);
      if (!body?.content || typeof body.content !== "object") {
        return json(res, 400, { error: "Contenido inválido." });
      }

      let sha = body.sha;
      if (!sha) {
        const current = await githubGetFile(CONTENT_PATH);
        sha = current.sha;
      }

      const pretty = `${JSON.stringify(body.content, null, 2)}\n`;
      const contentBase64 = Buffer.from(pretty, "utf8").toString("base64");
      const result = await githubPutFile(
        CONTENT_PATH,
        contentBase64,
        "content: update site.json via admin panel",
        sha,
      );

      if (process.env.DEPLOY_HOOK_URL) {
        try {
          await fetch(process.env.DEPLOY_HOOK_URL, { method: "POST" });
        } catch {
          // Non-blocking: content is already in GitHub.
        }
      }

      return json(res, 200, {
        ok: true,
        sha: result.content?.sha,
        message: "Cambios enviados; el sitio se actualizará en 1–2 minutos.",
      });
    } catch (error) {
      return json(res, 500, { error: error.message || "No se pudo guardar." });
    }
  }

  return json(res, 405, { error: "Método no permitido." });
}
