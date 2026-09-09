import {
  getBearer,
  githubDeleteFile,
  githubGetFile,
  githubListFiles,
  json,
  readBody,
  verifyToken,
} from "./_lib.js";

function assertAuth(req, res) {
  const secret = process.env.ADMIN_SECRET || "";
  const payload = verifyToken(getBearer(req), secret);
  if (!payload) {
    json(res, 401, { error: "Sesión inválida o expirada. Volvé a iniciar sesión." });
    return null;
  }
  return payload;
}

function isAllowedMediaPath(path) {
  const normalized = String(path || "").replace(/^\/+/, "");
  const full = normalized.startsWith("public/") ? normalized : `public/${normalized}`;
  return (
    full.startsWith("public/gallery/") ||
    full === "public/gallery" ||
    full.startsWith("public/docs/") ||
    full === "public/docs"
  );
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    if (!assertAuth(req, res)) return;
    try {
      const files = await githubListFiles(["public/gallery", "public/docs"]);
      return json(res, 200, { ok: true, files });
    } catch (error) {
      return json(res, 500, { error: error.message || "No se pudo listar los medios." });
    }
  }

  if (req.method === "DELETE") {
    if (!assertAuth(req, res)) return;
    try {
      const body = await readBody(req);
      const rawPath = body?.path || body?.url;
      if (!rawPath) return json(res, 400, { error: "Falta la ruta del archivo." });

      let path = String(rawPath).replace(/^\/+/, "");
      if (!path.startsWith("public/")) path = `public/${path}`;

      if (!isAllowedMediaPath(path)) {
        return json(res, 400, { error: "Solo se pueden eliminar archivos de gallery o docs." });
      }

      const existing = await githubGetFile(path);
      await githubDeleteFile(path, existing.sha, `content: delete ${path} via admin panel`);
      return json(res, 200, {
        ok: true,
        message: `Eliminado ${path.replace(/^public/, "")}.`,
      });
    } catch (error) {
      return json(res, 500, { error: error.message || "No se pudo eliminar el archivo." });
    }
  }

  return json(res, 405, { error: "Método no permitido." });
}
