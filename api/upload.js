import {
  getBearer,
  githubGetFile,
  githubPutFile,
  json,
  readBody,
  verifyToken,
} from "./_lib.js";

function sanitizeName(name) {
  return String(name || "upload")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return json(res, 405, { error: "Método no permitido." });
  }

  const secret = process.env.ADMIN_SECRET || "";
  const payload = verifyToken(getBearer(req), secret);
  if (!payload) {
    return json(res, 401, { error: "Sesión inválida o expirada. Volvé a iniciar sesión." });
  }

  try {
    const body = await readBody(req);
    const dataUrl = body?.dataUrl;
    const filename = sanitizeName(body?.filename || `upload-${Date.now()}.jpg`);
    const folder = body?.folder === "remodelacion" ? "gallery/remodelacion" : "gallery";

    if (!dataUrl || typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) {
      return json(res, 400, { error: "Archivo inválido." });
    }

    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return json(res, 400, { error: "Formato de imagen no soportado." });

    const mime = match[1];
    if (!mime.startsWith("image/") && mime !== "application/pdf") {
      return json(res, 400, { error: "Solo se permiten imágenes o PDF." });
    }

    const base64 = match[2];
    // ~4.5MB limit decoded approx
    if (base64.length > 6_000_000) {
      return json(res, 400, { error: "El archivo es demasiado grande (máx. ~4 MB)." });
    }

    const extFromMime =
      mime === "image/png"
        ? "png"
        : mime === "image/webp"
          ? "webp"
          : mime === "application/pdf"
            ? "pdf"
            : "jpg";
    const finalName = filename.includes(".") ? filename : `${filename}.${extFromMime}`;
    const path = mime === "application/pdf" ? `public/docs/${finalName}` : `public/${folder}/${finalName}`;

    let sha;
    try {
      const existing = await githubGetFile(path);
      sha = existing.sha;
    } catch {
      sha = undefined;
    }

    const result = await githubPutFile(
      path,
      base64,
      `content: upload ${finalName} via admin panel`,
      sha,
    );

    const publicUrl = path.replace(/^public/, "");
    return json(res, 200, {
      ok: true,
      url: publicUrl,
      sha: result.content?.sha,
      message: "Archivo subido. Guardá el contenido para asociarlo al sitio.",
    });
  } catch (error) {
    return json(res, 500, { error: error.message || "No se pudo subir el archivo." });
  }
}
