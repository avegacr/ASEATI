const TOKEN_KEY = "aseati_admin_token";
const SHA_KEY = "aseati_admin_sha";

const loginView = document.querySelector("#login-view");
const appView = document.querySelector("#app-view");
const loginForm = document.querySelector("#login-form");
const loginError = document.querySelector("#login-error");
const passwordInput = document.querySelector("#password");
const togglePasswordBtn = document.querySelector("#toggle-password");
const editor = document.querySelector("#editor");
const statusEl = document.querySelector("#status");
const saveBtn = document.querySelector("#save-btn");
const logoutBtn = document.querySelector("#logout-btn");

let content = null;
let activeTab = "hero";
let dirty = false;
let mediaCache = null;

const FOLDER_BY_BASE = {
  "fiestasAti.photos": "gallery/fiestas",
  "acreditacion.photos": "gallery/acreditacion",
  "queHacemos.photos": "gallery/que-hacemos",
  "quienesSomos.photos": "gallery/quienes",
  "tiendati.photos": "gallery/tiendati",
  "remodelacion.steps": "gallery/remodelacion",
};

const FOLDER_BY_TARGET = {
  "hero.logoSrc": "gallery",
  "queEs.image.src": "gallery",
  "junta.photo.src": "gallery/junta",
  "tiendati.logoSrc": "gallery/tiendati",
  "reglamento.pdfUrl": "docs",
  "meta.ogImage": "gallery",
};

function getToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

function clearSession() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(SHA_KEY);
}

function setStatus(message, type = "") {
  if (!statusEl) return;
  const text = String(message || "").trim();
  statusEl.textContent = text;
  statusEl.className = `status ${type}`.trim();
  statusEl.hidden = !text;
  if (text) {
    statusEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
}

function setSaveButtonState(state) {
  if (!saveBtn) return;
  saveBtn.classList.remove("is-saved", "is-error");
  if (state === "saving") {
    saveBtn.disabled = true;
    saveBtn.textContent = "Guardando…";
    return;
  }
  if (state === "saved") {
    saveBtn.disabled = false;
    saveBtn.textContent = "Guardado";
    saveBtn.classList.add("is-saved");
    return;
  }
  if (state === "error") {
    saveBtn.disabled = false;
    saveBtn.textContent = "Error al guardar";
    saveBtn.classList.add("is-error");
    return;
  }
  saveBtn.disabled = false;
  saveBtn.textContent = "Guardar cambios";
}

function markDirty() {
  dirty = true;
}

function clearDirty() {
  dirty = false;
}

function escapeAttr(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function field(label, key, value, multiline = false) {
  const id = `f-${key.replaceAll(".", "-")}`;
  if (multiline) {
    return `<div class="field"><label for="${id}">${label}</label><textarea id="${id}" data-key="${key}">${escapeAttr(value)}</textarea></div>`;
  }
  return `<div class="field"><label for="${id}">${label}</label><input id="${id}" data-key="${key}" value="${escapeAttr(value)}" /></div>`;
}

function imagePreview(src) {
  const url = String(src || "").trim();
  if (!url) {
    return `<div class="media-preview empty"><span>Sin imagen</span></div>`;
  }
  if (url.toLowerCase().endsWith(".pdf") || url.includes("/docs/")) {
    return `<div class="media-preview pdf"><a href="${escapeAttr(url)}" target="_blank" rel="noopener">Abrir PDF</a><code>${escapeAttr(url)}</code></div>`;
  }
  return `<div class="media-preview"><img src="${escapeAttr(url)}" alt="" loading="lazy" /><div class="media-preview-meta"><a href="${escapeAttr(url)}" target="_blank" rel="noopener">Abrir</a><code>${escapeAttr(url)}</code></div></div>`;
}

function moveButtons() {
  return `
    <button type="button" data-action="up">Arriba</button>
    <button type="button" data-action="down">Abajo</button>
    <button type="button" class="danger" data-action="remove">Eliminar</button>`;
}

function readFields(root = editor) {
  root.querySelectorAll("[data-key]").forEach((el) => {
    const key = el.getAttribute("data-key");
    if (el.type === "checkbox") {
      setPath(content, key, el.checked);
      return;
    }
    setPath(content, key, el.value);
  });
}

function getPath(obj, path) {
  return path.split(".").reduce((cur, part) => (cur == null ? undefined : cur[part]), obj);
}

function setPath(obj, path, value) {
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i];
    const next = parts[i + 1];
    const isIndex = String(Number(next)) === next;
    if (cur[part] == null) cur[part] = isIndex ? [] : {};
    cur = cur[part];
  }
  cur[parts[parts.length - 1]] = value;
}

function ensureArray(path) {
  const parts = path.split(".");
  let cur = content;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i];
    if (cur[part] == null) cur[part] = {};
    cur = cur[part];
  }
  const last = parts[parts.length - 1];
  if (!Array.isArray(cur[last])) cur[last] = [];
  return cur[last];
}

function paragraphsEditor(baseKey, paragraphs) {
  return `
    <div class="list" data-list="paragraphs" data-base="${baseKey}">
      ${(paragraphs ?? [])
        .map(
          (p, i) => `
        <div class="item" data-index="${i}">
          ${field(`Párrafo ${i + 1}`, `${baseKey}.${i}`, p, true)}
          <div class="item-actions">${moveButtons()}</div>
        </div>`,
        )
        .join("")}
      <button type="button" class="primary" data-action="add-paragraph">Agregar párrafo</button>
    </div>`;
}

function featuresEditor(features) {
  return `
    <div class="list" data-list="features" data-base="queHacemos.features">
      ${(features ?? [])
        .map(
          (f, i) => `
        <div class="item" data-index="${i}">
          ${field("Título", `queHacemos.features.${i}.title`, f.title)}
          ${field("Texto", `queHacemos.features.${i}.text`, f.text, true)}
          <div class="item-actions">${moveButtons()}</div>
        </div>`,
        )
        .join("")}
      <button type="button" class="primary" data-action="add-kv" data-empty='{"title":"","text":""}'>Agregar ítem</button>
    </div>`;
}

function kvListEditor(basePath, items, fields, addLabel) {
  return `
    <div class="list" data-list="kv" data-base="${basePath}">
      ${(items ?? [])
        .map(
          (item, i) => `
        <div class="item" data-index="${i}">
          ${fields
            .map((f) => field(f.label, `${basePath}.${i}.${f.key}`, item?.[f.key] ?? "", Boolean(f.multiline)))
            .join("")}
          <div class="item-actions">${moveButtons()}</div>
        </div>`,
        )
        .join("")}
      <button type="button" class="primary" data-action="add-kv" data-empty='${escapeAttr(JSON.stringify(Object.fromEntries(fields.map((f) => [f.key, ""]))))}'>${addLabel}</button>
    </div>`;
}

function photosEditor(basePath, photos, withClass = false) {
  const folder = FOLDER_BY_BASE[basePath] || "gallery";
  return `
    <div class="list" data-list="photos" data-base="${basePath}" data-folder="${folder}">
      ${(photos ?? [])
        .map(
          (p, i) => `
        <div class="item" data-index="${i}">
          ${imagePreview(p.src)}
          ${field("URL imagen", `${basePath}.${i}.src`, p.src)}
          ${field("Texto alternativo", `${basePath}.${i}.alt`, p.alt)}
          ${withClass ? field("Clase (mosaic-tall / mosaic-wide / vacío)", `${basePath}.${i}.className`, p.className || "") : ""}
          <div class="item-actions">
            <button type="button" data-action="upload" data-folder="${folder}">Subir archivo</button>
            ${moveButtons()}
          </div>
        </div>`,
        )
        .join("")}
      <button type="button" class="primary" data-action="add-photo">Agregar foto</button>
    </div>`;
}

function rolesEditor(roles) {
  return `
    <div class="list" data-list="roles" data-base="puestos.roles">
      ${(roles ?? [])
        .map(
          (r, i) => `
        <div class="item" data-index="${i}">
          ${field("Puesto", `puestos.roles.${i}.title`, r.title)}
          ${field("Descripción", `puestos.roles.${i}.text`, r.text, true)}
          <div class="item-actions">${moveButtons()}</div>
        </div>`,
        )
        .join("")}
      <button type="button" class="primary" data-action="add-kv" data-empty='{"title":"","text":""}'>Agregar puesto</button>
    </div>`;
}

function membersEditor(members) {
  return `
    <div class="list" data-list="members" data-base="junta.members">
      ${(members ?? [])
        .map(
          (m, i) => `
        <div class="item" data-index="${i}">
          ${field("Nombre", `junta.members.${i}.name`, m.name)}
          ${field("Puesto", `junta.members.${i}.role`, m.role)}
          <div class="item-actions">${moveButtons()}</div>
        </div>`,
        )
        .join("")}
      <button type="button" class="primary" data-action="add-kv" data-empty='{"name":"","role":""}'>Agregar miembro</button>
    </div>`;
}

function remodelEditor(steps) {
  return `
    <div class="list" data-list="steps" data-base="remodelacion.steps" data-folder="gallery/remodelacion">
      ${(steps ?? [])
        .map(
          (s, i) => `
        <div class="item" data-index="${i}">
          ${imagePreview(s.src)}
          ${field("URL imagen", `remodelacion.steps.${i}.src`, s.src)}
          ${field("Texto alternativo", `remodelacion.steps.${i}.alt`, s.alt)}
          ${field("Pie de foto", `remodelacion.steps.${i}.caption`, s.caption)}
          <div class="item-actions">
            <button type="button" data-action="upload" data-folder="gallery/remodelacion">Subir archivo</button>
            ${moveButtons()}
          </div>
        </div>`,
        )
        .join("")}
      <button type="button" class="primary" data-action="add-kv" data-empty='{"src":"","alt":"","caption":""}'>Agregar paso</button>
    </div>`;
}

function singleImageBlock(title, srcKey, altKey, captionKey, folder) {
  const src = getPath(content, srcKey) || "";
  return `
    <h3>${title}</h3>
    ${imagePreview(src)}
    ${field("URL", srcKey, src)}
    ${altKey ? field("Alt", altKey, getPath(content, altKey) || "") : ""}
    ${captionKey ? field("Pie", captionKey, getPath(content, captionKey) || "") : ""}
    <div class="item-actions">
      <button type="button" data-action="upload-single" data-target="${srcKey}" data-folder="${folder}">Subir archivo</button>
    </div>`;
}

function navEditor(nav) {
  const groups = nav?.groups ?? [];
  return `
    <div class="list" data-list="nav-groups" data-base="nav.groups">
      ${groups
        .map(
          (g, gi) => `
        <div class="item" data-index="${gi}">
          ${field("Etiqueta del grupo", `nav.groups.${gi}.label`, g.label)}
          ${field("ID (para aria)", `nav.groups.${gi}.id`, g.id || "")}
          <div class="list" data-list="nav-links" data-base="nav.groups.${gi}.links">
            ${(g.links ?? [])
              .map(
                (link, li) => `
              <div class="item nested" data-index="${li}">
                ${field("Texto", `nav.groups.${gi}.links.${li}.label`, link.label)}
                ${field("Enlace (#sección)", `nav.groups.${gi}.links.${li}.href`, link.href)}
                <div class="item-actions">${moveButtons()}</div>
              </div>`,
              )
              .join("")}
            <button type="button" class="primary" data-action="add-kv" data-empty='{"label":"","href":"#"}'>Agregar enlace</button>
          </div>
          <div class="item-actions">${moveButtons()}</div>
        </div>`,
        )
        .join("")}
      <button type="button" class="primary" data-action="add-kv" data-empty='{"id":"","label":"Nuevo grupo","links":[]}'>Agregar grupo</button>
    </div>
    <h3>Enlaces directos</h3>
    ${kvListEditor(
      "nav.directLinks",
      nav?.directLinks ?? [],
      [
        { key: "label", label: "Texto" },
        { key: "href", label: "Enlace (#sección)" },
      ],
      "Agregar enlace directo",
    )}`;
}

async function renderMediaTab() {
  setStatus("Cargando medios…");
  try {
    const data = await api("/api/media");
    mediaCache = data.files || [];
    setStatus(`${mediaCache.length} archivos en gallery/docs.`);
  } catch (error) {
    mediaCache = [];
    setStatus(error.message, "err");
  }

  const files = mediaCache || [];
  return `<section class="panel"><h2>Medios</h2>
    <p class="hint">Archivos en el repositorio bajo <code>/gallery</code> y <code>/docs</code>. Copiá la ruta o eliminá archivos no usados. Para asociarlos a una sección, pegá la URL en el campo correspondiente y guardá.</p>
    <div class="item-actions" style="margin-bottom:0.75rem">
      <button type="button" class="primary" data-action="refresh-media">Actualizar lista</button>
    </div>
    <div class="media-grid">
      ${files
        .map((file) => {
          const isPdf = file.url.toLowerCase().endsWith(".pdf");
          return `
          <article class="media-card" data-path="${escapeAttr(file.path)}">
            ${
              isPdf
                ? `<div class="media-card-preview pdf">PDF</div>`
                : `<img src="${escapeAttr(file.url)}" alt="" loading="lazy" />`
            }
            <code>${escapeAttr(file.url)}</code>
            <div class="item-actions">
              <button type="button" data-action="copy-url" data-url="${escapeAttr(file.url)}">Copiar ruta</button>
              <a href="${escapeAttr(file.url)}" target="_blank" rel="noopener">Abrir</a>
              <button type="button" class="danger" data-action="delete-media" data-path="${escapeAttr(file.path)}">Eliminar</button>
            </div>
          </article>`;
        })
        .join("") || `<p class="hint">No hay archivos listados todavía.</p>`}
    </div>
  </section>`;
}

function renderTab() {
  if (!content) return;
  const c = content;
  let html = "";

  if (activeTab === "hero") {
    html = `<section class="panel"><h2>Hero</h2>
      ${field("Título", "hero.title", c.hero.title, true)}
      ${field("Texto introductorio", "hero.lead", c.hero.lead, true)}
      ${singleImageBlock("Logo", "hero.logoSrc", "hero.logoAlt", null, "gallery")}
      ${field("CTA principal · texto", "hero.primaryCta.label", c.hero.primaryCta.label)}
      ${field("CTA principal · enlace", "hero.primaryCta.href", c.hero.primaryCta.href)}
      ${field("CTA secundario · texto", "hero.secondaryCta.label", c.hero.secondaryCta.label)}
      ${field("CTA secundario · enlace", "hero.secondaryCta.href", c.hero.secondaryCta.href)}
    </section>`;
  }

  if (activeTab === "nav") {
    html = `<section class="panel"><h2>Navegación</h2>
      <p class="hint">Editá grupos del menú y sus enlaces. Usá anclas existentes (#que-es, #fiestas-ati, etc.).</p>
      ${navEditor(c.nav ?? { groups: [], directLinks: [] })}
    </section>`;
  }

  if (activeTab === "queEs") {
    html = `<section class="panel"><h2>Qué es ASEATI</h2>
      ${field("Eyebrow", "queEs.eyebrow", c.queEs.eyebrow)}
      ${field("Título", "queEs.title", c.queEs.title)}
      ${field("Lead", "queEs.lead", c.queEs.lead, true)}
      <h3>Párrafos</h3>
      ${paragraphsEditor("queEs.paragraphs", c.queEs.paragraphs)}
      ${singleImageBlock("Imagen", "queEs.image.src", "queEs.image.alt", "queEs.image.caption", "gallery")}
    </section>`;
  }

  if (activeTab === "carreraAti") {
    const a = c.carreraAti ?? {};
    html = `<section class="panel"><h2>Qué es ATI</h2>
      ${field("Eyebrow", "carreraAti.eyebrow", a.eyebrow)}
      ${field("Título", "carreraAti.title", a.title)}
      ${field("Lead", "carreraAti.lead", a.lead, true)}
      <h3>Párrafos</h3>
      ${paragraphsEditor("carreraAti.paragraphs", a.paragraphs ?? [])}
      <h3>Rol destacado</h3>
      ${field("Título del rol", "carreraAti.roleTitle", a.roleTitle)}
      ${field("Texto del rol", "carreraAti.roleText", a.roleText, true)}
      <h3>Datos clave</h3>
      ${kvListEditor(
        "carreraAti.facts",
        a.facts ?? [],
        [
          { key: "value", label: "Valor" },
          { key: "label", label: "Etiqueta" },
        ],
        "Agregar dato",
      )}
      <h3>Plan de estudios</h3>
      ${field("Título", "carreraAti.planTitle", a.planTitle)}
      ${field("Lead", "carreraAti.planLead", a.planLead, true)}
      ${kvListEditor(
        "carreraAti.planAreas",
        a.planAreas ?? [],
        [
          { key: "title", label: "Área" },
          { key: "text", label: "Descripción", multiline: true },
        ],
        "Agregar área",
      )}
      <h3>Proyección laboral</h3>
      ${field("Título", "carreraAti.careersTitle", a.careersTitle)}
      ${field("Lead", "carreraAti.careersLead", a.careersLead, true)}
      ${kvListEditor(
        "carreraAti.careers",
        a.careers ?? [],
        [
          { key: "title", label: "Rol" },
          { key: "text", label: "Descripción", multiline: true },
        ],
        "Agregar rol",
      )}
      <h3>Enlace al TEC</h3>
      ${field("Texto del botón", "carreraAti.ctaLabel", a.ctaLabel)}
      ${field("URL", "carreraAti.ctaHref", a.ctaHref)}
    </section>`;
  }

  if (activeTab === "acreditacion") {
    const a = c.acreditacion ?? {};
    html = `<section class="panel"><h2>Acreditación</h2>
      ${field("Eyebrow", "acreditacion.eyebrow", a.eyebrow)}
      ${field("Título", "acreditacion.title", a.title)}
      ${field("Lead", "acreditacion.lead", a.lead, true)}
      <h3>Datos clave</h3>
      ${kvListEditor(
        "acreditacion.stats",
        a.stats ?? [],
        [
          { key: "value", label: "Valor" },
          { key: "label", label: "Etiqueta" },
        ],
        "Agregar dato",
      )}
      <h3>Párrafos</h3>
      ${paragraphsEditor("acreditacion.paragraphs", a.paragraphs ?? [])}
      <h3>Cita</h3>
      ${field("Texto", "acreditacion.quote.text", a.quote?.text, true)}
      ${field("Autor", "acreditacion.quote.author", a.quote?.author)}
      ${field("Rol", "acreditacion.quote.role", a.quote?.role)}
      <h3>Fotos</h3>
      ${photosEditor("acreditacion.photos", a.photos ?? [])}
      <h3>Enlaces / noticias</h3>
      ${field("Etiqueta", "acreditacion.linksLabel", a.linksLabel || "Más información y noticias")}
      ${kvListEditor(
        "acreditacion.links",
        a.links ?? [],
        [
          { key: "label", label: "Texto del enlace" },
          { key: "href", label: "URL" },
        ],
        "Agregar enlace",
      )}
    </section>`;
  }

  if (activeTab === "queHacemos") {
    html = `<section class="panel"><h2>Qué hacemos</h2>
      ${field("Eyebrow", "queHacemos.eyebrow", c.queHacemos.eyebrow)}
      ${field("Título", "queHacemos.title", c.queHacemos.title)}
      ${field("Lead", "queHacemos.lead", c.queHacemos.lead, true)}
      <h3>Ítems</h3>
      ${featuresEditor(c.queHacemos.features)}
      <h3>Fotos</h3>
      ${photosEditor("queHacemos.photos", c.queHacemos.photos, true)}
    </section>`;
  }

  if (activeTab === "fiestasAti") {
    html = `<section class="panel"><h2>Fiestas ATI</h2>
      ${field("Eyebrow", "fiestasAti.eyebrow", c.fiestasAti.eyebrow)}
      ${field("Título", "fiestasAti.title", c.fiestasAti.title)}
      ${field("Lead", "fiestasAti.lead", c.fiestasAti.lead, true)}
      <h3>Párrafos</h3>
      ${paragraphsEditor("fiestasAti.paragraphs", c.fiestasAti.paragraphs)}
      ${field("Nota", "fiestasAti.note", c.fiestasAti.note, true)}
      <h3>Fotos</h3>
      ${photosEditor("fiestasAti.photos", c.fiestasAti.photos, true)}
    </section>`;
  }

  if (activeTab === "quienesSomos") {
    html = `<section class="panel"><h2>Quiénes somos</h2>
      ${field("Eyebrow", "quienesSomos.eyebrow", c.quienesSomos.eyebrow)}
      ${field("Título", "quienesSomos.title", c.quienesSomos.title)}
      ${field("Lead", "quienesSomos.lead", c.quienesSomos.lead, true)}
      <h3>Párrafos</h3>
      ${paragraphsEditor("quienesSomos.paragraphs", c.quienesSomos.paragraphs)}
      <h3>Fotos</h3>
      ${photosEditor("quienesSomos.photos", c.quienesSomos.photos)}
    </section>`;
  }

  if (activeTab === "puestos") {
    html = `<section class="panel"><h2>Puestos</h2>
      ${field("Eyebrow", "puestos.eyebrow", c.puestos.eyebrow)}
      ${field("Título", "puestos.title", c.puestos.title)}
      ${field("Lead", "puestos.lead", c.puestos.lead, true)}
      ${field("Intro", "puestos.intro", c.puestos.intro, true)}
      ${field("Título requisitos", "puestos.requirementsTitle", c.puestos.requirementsTitle)}
      <h3>Requisitos</h3>
      ${paragraphsEditor("puestos.requirements", c.puestos.requirements ?? [])}
      ${field("Nota (HTML permitido)", "puestos.noteHtml", c.puestos.noteHtml, true)}
      ${field("Título de cargos", "puestos.rolesTitle", c.puestos.rolesTitle)}
      <h3>Roles</h3>
      ${rolesEditor(c.puestos.roles)}
    </section>`;
  }

  if (activeTab === "junta") {
    html = `<section class="panel"><h2>Junta Directiva</h2>
      ${field("Año", "junta.year", c.junta.year ?? "")}
      ${field("Eyebrow", "junta.eyebrow", c.junta.eyebrow)}
      ${field("Título", "junta.title", c.junta.title)}
      ${field("Lead", "junta.lead", c.junta.lead, true)}
      ${singleImageBlock("Foto grupal", "junta.photo.src", "junta.photo.alt", "junta.photo.caption", "gallery/junta")}
      <div class="field"><label><input type="checkbox" data-key="junta.photo.hidden" ${c.junta.photo?.hidden ? "checked" : ""} /> Ocultar foto en el sitio público</label></div>
      <h3>Miembros</h3>
      ${membersEditor(c.junta.members)}
    </section>`;
  }

  if (activeTab === "tiendati") {
    html = `<section class="panel"><h2>TIENDATI</h2>
      ${field("Eyebrow", "tiendati.eyebrow", c.tiendati.eyebrow)}
      ${field("Título", "tiendati.title", c.tiendati.title)}
      ${singleImageBlock("Logo", "tiendati.logoSrc", "tiendati.logoAlt", null, "gallery/tiendati")}
      ${field("Lead", "tiendati.lead", c.tiendati.lead, true)}
      ${field("Nota", "tiendati.note", c.tiendati.note, true)}
      <h3>Fotos</h3>
      ${photosEditor("tiendati.photos", c.tiendati.photos)}
    </section>`;
  }

  if (activeTab === "remodelacion") {
    html = `<section class="panel"><h2>Remodelación</h2>
      ${field("Eyebrow", "remodelacion.eyebrow", c.remodelacion.eyebrow)}
      ${field("Título", "remodelacion.title", c.remodelacion.title)}
      ${field("Lead", "remodelacion.lead", c.remodelacion.lead, true)}
      <h3>Pasos (orden cronológico)</h3>
      ${remodelEditor(c.remodelacion.steps)}
    </section>`;
  }

  if (activeTab === "reglamento") {
    html = `<section class="panel"><h2>Reglamento</h2>
      ${field("Eyebrow", "reglamento.eyebrow", c.reglamento.eyebrow)}
      ${field("Título", "reglamento.title", c.reglamento.title)}
      ${field("Lead", "reglamento.lead", c.reglamento.lead, true)}
      ${imagePreview(c.reglamento.pdfUrl)}
      ${field("URL del PDF", "reglamento.pdfUrl", c.reglamento.pdfUrl)}
      ${field("Nombre de descarga", "reglamento.pdfDownloadName", c.reglamento.pdfDownloadName)}
      ${field("Texto botón abrir", "reglamento.openLabel", c.reglamento.openLabel)}
      ${field("Texto botón descargar", "reglamento.downloadLabel", c.reglamento.downloadLabel)}
      <div class="item-actions"><button type="button" data-action="upload-single" data-target="reglamento.pdfUrl" data-folder="docs">Subir PDF</button></div>
      <p class="hint">Podés subir un PDF nuevo; luego guardá los cambios para publicar.</p>
    </section>`;
  }

  if (activeTab === "consultas") {
    const q = c.consultas ?? {};
    html = `<section class="panel"><h2>Buzón de consultas</h2>
      ${field("Eyebrow", "consultas.eyebrow", q.eyebrow)}
      ${field("Título", "consultas.title", q.title)}
      ${field("Lead", "consultas.lead", q.lead, true)}
      ${field("Leyenda de modo", "consultas.modeLegend", q.modeLegend || "¿Cómo querés enviarlo?")}
      ${field("Etiqueta con datos", "consultas.identifiedLabel", q.identifiedLabel)}
      ${field("Etiqueta anónimo", "consultas.anonymousLabel", q.anonymousLabel)}
      ${field("Nota con datos", "consultas.identifiedNote", q.identifiedNote, true)}
      ${field("Nota anónimo", "consultas.anonymousNote", q.anonymousNote, true)}
      ${field("Etiqueta tipo", "consultas.topicLabel", q.topicLabel || "Tipo de mensaje")}
      ${field("Etiqueta nombre", "consultas.nameLabel", q.nameLabel || "Nombre")}
      ${field("Placeholder nombre", "consultas.namePlaceholder", q.namePlaceholder || "Tu nombre")}
      ${field("Etiqueta correo", "consultas.emailLabel", q.emailLabel || "Correo (opcional)")}
      ${field("Placeholder correo", "consultas.emailPlaceholder", q.emailPlaceholder || "para poder responderte")}
      ${field("Etiqueta mensaje", "consultas.messageLabel", q.messageLabel || "Mensaje")}
      ${field("Placeholder mensaje", "consultas.messagePlaceholder", q.messagePlaceholder || "", true)}
      ${field("Texto del botón", "consultas.submitLabel", q.submitLabel)}
      <h3>Opciones de tema</h3>
      ${kvListEditor(
        "consultas.topics",
        q.topics ?? [],
        [
          { key: "value", label: "Valor (enviado)" },
          { key: "label", label: "Texto visible" },
        ],
        "Agregar opción",
      )}
      <p class="hint">La estructura del formulario (campos y envío) no se cambia por seguridad. Sí podés editar textos y opciones del menú de tema.</p>
    </section>`;
  }

  if (activeTab === "footer") {
    html = `<section class="panel"><h2>Contacto / Footer / SEO</h2>
      ${field("Texto institucional", "footer.blurb", c.footer.blurb, true)}
      ${field("Etiqueta contacto", "footer.contactLabel", c.footer.contactLabel)}
      ${field("Correo", "footer.email", c.footer.email)}
      ${field("Instagram (handle sin @)", "footer.instagramHandle", c.footer.instagramHandle)}
      ${field("Instagram URL", "footer.instagramUrl", c.footer.instagramUrl)}
      ${field("WhatsApp (texto)", "footer.whatsappDisplay", c.footer.whatsappDisplay)}
      ${field("WhatsApp URL", "footer.whatsappUrl", c.footer.whatsappUrl)}
      ${field("Texto de copyright", "footer.copySuffix", c.footer.copySuffix)}
      <h3>SEO / Open Graph</h3>
      ${field("Meta título", "meta.title", c.meta.title)}
      ${field("Meta descripción", "meta.description", c.meta.description, true)}
      ${field("URL del sitio", "meta.siteUrl", c.meta.siteUrl)}
      ${imagePreview(c.meta.ogImage)}
      ${field("Imagen OG (URL absoluta o /ruta)", "meta.ogImage", c.meta.ogImage)}
      <div class="item-actions"><button type="button" data-action="upload-single" data-target="meta.ogImage" data-folder="gallery">Subir imagen OG</button></div>
    </section>`;
  }

  if (activeTab === "medios") {
    renderMediaTab().then((mediaHtml) => {
      if (activeTab === "medios") editor.innerHTML = mediaHtml;
    });
    editor.innerHTML = `<section class="panel"><h2>Medios</h2><p class="hint">Cargando…</p></section>`;
    return;
  }

  editor.innerHTML = html;
}

function syncFromDom() {
  if (!content) return;
  readFields();
}

function moveItem(arr, index, dir) {
  if (!Array.isArray(arr)) return;
  const target = index + dir;
  if (target < 0 || target >= arr.length) return;
  const [item] = arr.splice(index, 1);
  arr.splice(target, 0, item);
}

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);

  let response;
  try {
    response = await fetch(path, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Error de tiempo de espera - la solicitud tardó demasiado. Intentá de nuevo.");
    }
    throw new Error("Error de conexión - no se pudo conectar con el servidor. Revisá tu conexión.");
  } finally {
    clearTimeout(timeoutId);
  }

  const raw = await response.text().catch(() => "");
  let data = {};
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = { error: raw.replace(/\s+/g, " ").trim().slice(0, 240) };
    }
  }
  if (!response.ok) {
    throw new Error(formatHttpError(response.status, data.error || data.message || raw));
  }
  return data;
}

const HTTP_ERROR_HINTS = {
  400: "la solicitud no es válida",
  401: "sesión inválida o expirada; volvé a iniciar sesión",
  403: "no tenés permiso para esta acción",
  404: "no se encontró el recurso",
  405: "método no permitido",
  408: "la solicitud tardó demasiado",
  413: "el archivo es demasiado grande para la subida (probá con una imagen más liviana, máx. ~2 MB)",
  415: "tipo de archivo no soportado",
  429: "demasiados intentos; esperá un momento e intentá de nuevo",
  500: "error interno del servidor",
  502: "el servidor no respondió correctamente",
  503: "servicio no disponible temporalmente",
  504: "el servidor tardó demasiado en responder",
};

function formatHttpError(status, serverMessage) {
  const code = Number(status) || 0;
  const hint = HTTP_ERROR_HINTS[code] || "ocurrió un error inesperado";
  let detail = String(serverMessage || "").trim();

  // Vercel a veces manda solo "Error 413" o "413 Payload Too Large".
  detail = detail
    .replace(/^Error\s*\d+\s*[-–—:]?\s*/i, "")
    .replace(/^\d+\s*(Payload Too Large)?\s*[-–—:]?\s*/i, "")
    .trim();

  if (!code) {
    return detail || `Error - ${hint}`;
  }

  if (detail && detail.toLowerCase() !== hint.toLowerCase()) {
    return `Error ${code} - ${detail}`;
  }
  return `Error ${code} - ${hint}`;
}

function ensureNavDefaults() {
  if (!content.nav) {
    content.nav = {
      groups: [
        {
          id: "nosotros",
          label: "Nosotros",
          links: [
            { href: "#que-es", label: "Qué es ASEATI" },
            { href: "#carrera-ati", label: "Qué es ATI" },
            { href: "#que-hacemos", label: "Qué hacemos" },
            { href: "#quienes-somos", label: "Quiénes somos" },
            { href: "#acreditacion", label: "Acreditación" },
          ],
        },
        {
          id: "iniciativas",
          label: "Iniciativas",
          links: [
            { href: "#remodelacion", label: "Remodelación" },
            { href: "#tiendati", label: "TIENDATI" },
            { href: "#fiestas-ati", label: "Fiestas ATI" },
          ],
        },
        {
          id: "junta",
          label: "Junta",
          links: [
            { href: "#junta", label: "Junta 2026" },
            { href: "#puestos", label: "Puestos" },
          ],
        },
        {
          id: "docs",
          label: "Documentos",
          links: [{ href: "#reglamento", label: "Reglamento" }],
        },
      ],
      directLinks: [{ href: "#consultas", label: "Consultas" }],
    };
  }
  if (!content.consultas) content.consultas = {};
  if (!Array.isArray(content.consultas.topics) || !content.consultas.topics.length) {
    content.consultas.topics = [
      { value: "Consulta", label: "Consulta" },
      { value: "Inquietud", label: "Inquietud" },
      { value: "Situación", label: "Situación" },
      { value: "Sugerencia", label: "Sugerencia" },
      { value: "Otro", label: "Otro" },
    ];
  }
}

async function loadContent() {
  const staticRes = await fetch("/data/site.json", { cache: "no-store" });
  if (!staticRes.ok) throw new Error("No se pudo cargar el contenido.");
  content = await staticRes.json();
  ensureNavDefaults();
  ensureJuntaDefaults();
  renderTab();

  try {
    const data = await api("/api/content");
    if (data?.content) content = data.content;
    if (data?.sha) sessionStorage.setItem(SHA_KEY, data.sha);
    ensureNavDefaults();
    ensureJuntaDefaults();
    renderTab();
  } catch {
    // Keep static content; saving will still try GitHub and report errors.
  }
  clearDirty();
  await maybeShowJuntaOnboarding();
}

function ensureJuntaDefaults() {
  if (!content.junta || typeof content.junta !== "object") content.junta = {};
  if (!content.junta.photo || typeof content.junta.photo !== "object") {
    content.junta.photo = { src: "", alt: "", caption: "", hidden: false };
  }
  if (content.junta.photo.hidden == null) content.junta.photo.hidden = false;
  if (!Array.isArray(content.junta.members)) content.junta.members = [];
  const year =
    Number(content.junta.year) ||
    extractYearFromText(content.junta.title) ||
    new Date().getFullYear();
  content.junta.year = year;
}

function extractYearFromText(value) {
  const match = String(value || "").match(/\b(20\d{2})\b/);
  return match ? Number(match[1]) : null;
}

function needsJuntaOnboarding() {
  if (!content?.junta) return false;
  const currentYear = new Date().getFullYear();
  const juntaYear = Number(content.junta.year) || 0;
  return juntaYear < currentYear;
}

function replaceYearInJuntaLabel(label, year) {
  const text = String(label || "").trim();
  if (!text) return `Junta ${year}`;
  if (/\b20\d{2}\b/.test(text)) return text.replace(/\b20\d{2}\b/g, String(year));
  if (/junta/i.test(text)) return `${text} ${year}`.replace(/\s+/g, " ").trim();
  return text;
}

function updateJuntaReferencesAcrossSite(year) {
  const y = String(year);

  if (!content.hero) content.hero = {};
  if (!content.hero.secondaryCta) content.hero.secondaryCta = { label: "", href: "#junta" };
  const secondary = content.hero.secondaryCta;
  if (!secondary.href || /#junta/i.test(secondary.href) || /junta/i.test(secondary.label || "")) {
    secondary.href = secondary.href || "#junta";
    secondary.label = replaceYearInJuntaLabel(secondary.label || "Junta", year);
    if (!/junta/i.test(secondary.label)) secondary.label = `Junta ${y}`;
  }

  const nav = content.nav;
  if (nav) {
    for (const group of nav.groups || []) {
      if (/junta/i.test(group.label || "") || group.id === "junta") {
        // Keep group short label; year goes on the specific link.
      }
      for (const link of group.links || []) {
        if (link.href === "#junta" || /junta/i.test(link.label || "")) {
          if (link.href === "#junta" || /#junta/i.test(link.href || "")) {
            link.label = replaceYearInJuntaLabel(link.label || "Junta Directiva", year);
          }
        }
      }
    }
    for (const link of nav.directLinks || []) {
      if (link.href === "#junta" || /junta/i.test(link.label || "")) {
        link.label = replaceYearInJuntaLabel(link.label || "Junta", year);
      }
    }
  }

  // Cualquier texto del contenido que mencione explícitamente "Junta … 20XX".
  const walk = (node, keyHint = "") => {
    if (typeof node === "string") {
      if (!/junta/i.test(node)) return node;
      // Evitar tocar periodos tipo 2026–2030 de acreditación u otros rangos.
      if (/\d{4}\s*[–-]\s*\d{4}/.test(node) && !/junta/i.test(keyHint)) return node;
      return node.replace(
        /(Junta(?:\s+Directiva)?(?:\s+ASEATI)?(?:\s*directiva)?(?:\s*[·•\-:])?\s*)(20\d{2})/gi,
        `$1${y}`,
      );
    }
    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i += 1) node[i] = walk(node[i], keyHint);
      return node;
    }
    if (node && typeof node === "object") {
      for (const [k, v] of Object.entries(node)) {
        // No reescribir URLs/archivos.
        if (/src|href|url|pdf|path|image/i.test(k) && typeof v === "string") continue;
        node[k] = walk(v, k);
      }
    }
    return node;
  };

  walk(content);
}

async function applyJuntaOnboarding({ year, members, photoMode, photoFile }) {
  ensureJuntaDefaults();
  const previousPhoto = content.junta.photo?.src || "";

  content.junta.year = year;
  content.junta.title = `Junta Directiva ${year}`;
  content.junta.members = members;
  content.junta.photo = content.junta.photo || {};
  content.junta.photo.alt = `Junta Directiva de ASEATI ${year} con camisetas institucionales`;
  content.junta.photo.caption = `Junta Directiva ASEATI · ${year}`;

  if (photoMode === "hide") {
    content.junta.photo.hidden = true;
  } else if (photoMode === "remove") {
    content.junta.photo.src = "";
    content.junta.photo.hidden = true;
  } else if (photoMode === "upload") {
    if (!photoFile) throw new Error("Seleccioná una imagen para la nueva foto de la Junta.");
    const maxBytes = 2.5 * 1024 * 1024;
    if (photoFile.size > maxBytes) {
      const mb = (photoFile.size / (1024 * 1024)).toFixed(1);
      throw new Error(
        `Error 413 - el archivo es demasiado grande para la subida (${mb} MB; máx. ~2.5 MB).`,
      );
    }
    setStatus("Subiendo foto de la Junta…");
    const uploaded = await uploadFile(photoFile, "gallery/junta");
    content.junta.photo.src = uploaded.url;
    content.junta.photo.hidden = false;
    try {
      await deleteReplacedMedia(previousPhoto, uploaded.url);
    } catch {
      // La nueva foto ya quedó; el borrado anterior es secundario.
    }
  } else {
    content.junta.photo.hidden = false;
  }

  updateJuntaReferencesAcrossSite(year);

  // Reafirmar campos clave tras el walk global.
  content.junta.year = year;
  content.junta.title = `Junta Directiva ${year}`;
  content.junta.members = members;
  content.junta.photo.alt = `Junta Directiva de ASEATI ${year} con camisetas institucionales`;
  content.junta.photo.caption = `Junta Directiva ASEATI · ${year}`;

  if (photoMode === "remove" && previousPhoto) {
    try {
      if (countMediaRefs(content, toDeletableMediaPath(previousPhoto)) === 0) {
        await api("/api/media", {
          method: "DELETE",
          body: JSON.stringify({ path: previousPhoto }),
        });
      }
    } catch {
      // Si falla el borrado, el sitio ya no muestra la foto.
    }
  }
}

const juntaOnboardingEl = document.querySelector("#junta-onboarding");
const juntaOnboardingForm = document.querySelector("#junta-onboarding-form");
const juntaMembersList = document.querySelector("#junta-members-list");
const juntaYearInput = document.querySelector("#junta-year");
const juntaOnboardingError = document.querySelector("#junta-onboarding-error");
const juntaPhotoUploadWrap = document.querySelector("#junta-photo-upload-wrap");
const juntaPhotoFile = document.querySelector("#junta-photo-file");
const juntaAddMemberBtn = document.querySelector("#junta-add-member");

function setJuntaOnboardingError(message) {
  if (!juntaOnboardingError) return;
  const text = String(message || "").trim();
  juntaOnboardingError.textContent = text;
  juntaOnboardingError.hidden = !text;
}

function renderJuntaMemberRows(members) {
  if (!juntaMembersList) return;
  const rows = members.length ? members : [{ name: "", role: "" }];
  juntaMembersList.innerHTML = rows
    .map(
      (member, index) => `
      <div class="junta-member-row" data-index="${index}">
        <div class="field">
          <label>Nombre completo</label>
          <input data-member-name value="${escapeAttr(member.name || "")}" required />
        </div>
        <div class="field">
          <label>Puesto</label>
          <input data-member-role value="${escapeAttr(member.role || "")}" required />
        </div>
        <div class="item-actions">
          <button type="button" class="danger" data-remove-member>Quitar</button>
        </div>
      </div>`,
    )
    .join("");
}

function readJuntaMemberRows() {
  if (!juntaMembersList) return [];
  return [...juntaMembersList.querySelectorAll(".junta-member-row")]
    .map((row) => ({
      name: row.querySelector("[data-member-name]")?.value.trim() || "",
      role: row.querySelector("[data-member-role]")?.value.trim() || "",
    }))
    .filter((m) => m.name || m.role);
}

function showJuntaOnboarding() {
  if (!juntaOnboardingEl || !content) return;
  const currentYear = new Date().getFullYear();
  if (juntaYearInput) juntaYearInput.value = String(currentYear);
  renderJuntaMemberRows(
    (content.junta.members || []).map((m) => ({
      name: "",
      role: m.role || "",
    })),
  );
  setJuntaOnboardingError("");
  if (juntaPhotoFile) juntaPhotoFile.value = "";
  const keepRadio = juntaOnboardingForm?.querySelector('input[name="photoMode"][value="keep"]');
  if (keepRadio) keepRadio.checked = true;
  if (juntaPhotoUploadWrap) juntaPhotoUploadWrap.hidden = true;
  juntaOnboardingEl.hidden = false;
  document.body.style.overflow = "hidden";
  juntaYearInput?.focus();
}

function hideJuntaOnboarding() {
  if (!juntaOnboardingEl) return;
  juntaOnboardingEl.hidden = true;
  document.body.style.overflow = "";
}

async function maybeShowJuntaOnboarding() {
  if (!needsJuntaOnboarding()) {
    hideJuntaOnboarding();
    return;
  }
  showJuntaOnboarding();
}

async function persistContent(message) {
  const data = await api("/api/content", {
    method: "PUT",
    body: JSON.stringify({
      content,
      sha: sessionStorage.getItem(SHA_KEY) || undefined,
    }),
  });
  if (data.sha) sessionStorage.setItem(SHA_KEY, data.sha);
  clearDirty();
  return data;
}

function showApp() {
  loginView.hidden = true;
  appView.hidden = false;
}

function showLogin() {
  appView.hidden = true;
  loginView.hidden = false;
}

async function uploadFile(file, folder = "gallery") {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  return api("/api/upload", {
    method: "POST",
    body: JSON.stringify({
      dataUrl,
      filename: file.name,
      folder,
    }),
  });
}

/** Normaliza URL de medio local a ruta pública (/gallery/... o /docs/...). */
function toDeletableMediaPath(url) {
  if (!url || typeof url !== "string") return null;
  let path = url.trim();
  if (!path) return null;
  try {
    if (/^https?:\/\//i.test(path)) path = new URL(path).pathname;
  } catch {
    return null;
  }
  path = path.split("?")[0].split("#")[0].replace(/^\/+/, "");
  if (path.startsWith("public/")) path = path.slice("public/".length);
  if (!(path.startsWith("gallery/") || path.startsWith("docs/"))) return null;
  if (!/\.[a-z0-9]+$/i.test(path)) return null;
  return `/${path}`;
}

function countMediaRefs(data, publicPath) {
  if (!publicPath || !data) return 0;
  let count = 0;
  const walk = (node) => {
    if (typeof node === "string") {
      if (toDeletableMediaPath(node) === publicPath) count += 1;
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (node && typeof node === "object") {
      Object.values(node).forEach(walk);
    }
  };
  walk(data);
  return count;
}

/** Tras reemplazar una imagen, borra el archivo anterior si ya no se referencia. */
async function deleteReplacedMedia(previousUrl, newUrl) {
  const prev = toDeletableMediaPath(previousUrl);
  const next = toDeletableMediaPath(newUrl);
  if (!prev || !next || prev === next) return { deleted: false };
  if (countMediaRefs(content, prev) > 0) {
    return { deleted: false, kept: true };
  }
  const result = await api("/api/media", {
    method: "DELETE",
    body: JSON.stringify({ path: prev }),
  });
  return { deleted: true, message: result.message };
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginError.hidden = true;
  const submitBtn = loginForm.querySelector('button[type="submit"]');
  const previousLabel = submitBtn?.textContent;
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Entrando…";
  }
  try {
    const password = passwordInput?.value ?? document.querySelector("#password").value;
    const data = await api("/api/auth", {
      method: "POST",
      body: JSON.stringify({ password }),
    });
    setToken(data.token);
    showApp();
    setStatus("Sesión iniciada. Cargando contenido…");
    await loadContent();
    setStatus("Contenido listo para editar.", "ok");
  } catch (error) {
    loginError.textContent = error.message || "No se pudo iniciar sesión.";
    loginError.hidden = false;
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = previousLabel || "Entrar";
    }
  }
});

function syncPasswordToggle() {
  if (!passwordInput || !togglePasswordBtn) return;
  const field = passwordInput.closest(".password-field");
  const visible = passwordInput.type === "text";
  field?.classList.toggle("is-visible", visible);
  togglePasswordBtn.setAttribute("aria-pressed", visible ? "true" : "false");
  togglePasswordBtn.setAttribute(
    "aria-label",
    visible ? "Ocultar contraseña" : "Mostrar contraseña"
  );
}

togglePasswordBtn?.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  if (!passwordInput) return;
  passwordInput.type = passwordInput.type === "password" ? "text" : "password";
  syncPasswordToggle();
  passwordInput.focus({ preventScroll: true });
});

logoutBtn.addEventListener("click", () => {
  clearSession();
  content = null;
  hideJuntaOnboarding();
  showLogin();
  setStatus("");
});

saveBtn.addEventListener("click", async () => {
  if (saveBtn.disabled) return;
  try {
    syncFromDom();
    setSaveButtonState("saving");
    setStatus("Guardando cambios…");
    const data = await api("/api/content", {
      method: "PUT",
      body: JSON.stringify({
        content,
        sha: sessionStorage.getItem(SHA_KEY) || undefined,
      }),
    });
    if (data.sha) sessionStorage.setItem(SHA_KEY, data.sha);
    clearDirty();
    const deployOk = !data.deploy || data.deploy === "triggered";
    setSaveButtonState(deployOk ? "saved" : "error");
    setStatus(
      data.message ||
        "Listo: cambios guardados. El sitio público puede tardar 1–2 minutos en actualizarse.",
      deployOk ? "ok" : "err",
    );
    window.setTimeout(() => setSaveButtonState("idle"), deployOk ? 2500 : 4500);
  } catch (error) {
    setSaveButtonState("error");
    setStatus(error.message || "No se pudo guardar. Intentá de nuevo.", "err");
    window.setTimeout(() => setSaveButtonState("idle"), 3500);
  }
});

document.querySelectorAll("[data-tab]").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (dirty && !confirm("Hay cambios sin guardar en esta pestaña. ¿Continuar igual?")) return;
    syncFromDom();
    activeTab = btn.getAttribute("data-tab");
    document.querySelectorAll("[data-tab]").forEach((b) => b.classList.toggle("active", b === btn));
    renderTab();
  });
});

editor.addEventListener("input", () => markDirty());
editor.addEventListener("change", () => markDirty());

editor.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action], a[data-action]");
  if (!button || !button.getAttribute("data-action")) return;
  const action = button.getAttribute("data-action");
  syncFromDom();

  const item = button.closest(".item");
  const index = item ? Number(item.getAttribute("data-index")) : -1;
  const listRoot = button.closest("[data-list]");
  const base = listRoot?.getAttribute("data-base") || button.closest("[data-base]")?.getAttribute("data-base");

  if (action === "refresh-media") {
    renderTab();
    return;
  }

  if (action === "copy-url") {
    const url = button.getAttribute("data-url");
    try {
      await navigator.clipboard.writeText(url);
      setStatus(`Ruta copiada: ${url}`, "ok");
    } catch {
      setStatus(`Copiá manualmente: ${url}`, "ok");
    }
    return;
  }

  if (action === "delete-media") {
    const path = button.getAttribute("data-path");
    if (!confirm(`¿Eliminar del repositorio?\n${path}`)) return;
    try {
      setStatus("Eliminando archivo…");
      const result = await api("/api/media", {
        method: "DELETE",
        body: JSON.stringify({ path }),
      });
      setStatus(result.message || "Archivo eliminado.", "ok");
      renderTab();
    } catch (error) {
      setStatus(error.message, "err");
    }
    return;
  }

  if (action === "add-paragraph") {
    ensureArray(base).push("");
    markDirty();
  }

  if (action === "add-photo") {
    const empty = base?.includes("queHacemos") || base?.includes("fiestasAti")
      ? { src: "", alt: "", className: "" }
      : { src: "", alt: "" };
    ensureArray(base).push(empty);
    markDirty();
  }

  if (action === "add-kv") {
    let empty = {};
    try {
      empty = JSON.parse(button.getAttribute("data-empty") || "{}");
    } catch {
      empty = {};
    }
    ensureArray(base).push(empty);
    markDirty();
  }

  if (action === "remove" && index >= 0 && base) {
    if (!confirm("¿Eliminar este elemento?")) return;
    ensureArray(base).splice(index, 1);
    markDirty();
  }

  if ((action === "up" || action === "down") && index >= 0 && base) {
    moveItem(ensureArray(base), index, action === "up" ? -1 : 1);
    markDirty();
  }

  if (action === "upload" || action === "upload-single") {
    const input = document.createElement("input");
    input.type = "file";
    const folder =
      button.getAttribute("data-folder") ||
      listRoot?.getAttribute("data-folder") ||
      FOLDER_BY_TARGET[button.getAttribute("data-target")] ||
      "gallery";
    input.accept = folder === "docs" ? "application/pdf" : "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        // El body va en base64 (~+33%) y Vercel corta cerca de 4.5 MB → Error 413.
        const maxBytes = folder === "docs" ? 4 * 1024 * 1024 : 2.5 * 1024 * 1024;
        if (file.size > maxBytes) {
          const mb = (file.size / (1024 * 1024)).toFixed(1);
          const maxMb = (maxBytes / (1024 * 1024)).toFixed(1);
          setStatus(
            `Error 413 - el archivo es demasiado grande para la subida (${mb} MB; máx. ~${maxMb} MB). Comprimilo o usá una imagen más liviana.`,
            "err",
          );
          return;
        }

        let previousUrl = "";
        if (action === "upload-single") {
          previousUrl = getPath(content, button.getAttribute("data-target")) || "";
        } else if (action === "upload" && index >= 0 && base) {
          previousUrl = ensureArray(base)[index]?.src || "";
        }

        setStatus("Subiendo archivo…");
        const result = await uploadFile(file, folder);
        if (action === "upload-single") {
          const target = button.getAttribute("data-target");
          let url = result.url;
          if (target === "meta.ogImage" && url.startsWith("/")) {
            const origin = (content.meta?.siteUrl || window.location.origin).replace(/\/$/, "");
            url = `${origin}${url}`;
          }
          setPath(content, target, url);
        } else if (action === "upload" && index >= 0 && base) {
          const arr = ensureArray(base);
          if (!arr[index]) arr[index] = {};
          arr[index].src = result.url;
        }
        markDirty();

        let statusMsg = result.message || "Archivo subido. Guardá los cambios.";
        try {
          const cleanup = await deleteReplacedMedia(previousUrl, result.url);
          if (cleanup.deleted) {
            statusMsg = `Archivo subido y se eliminó el anterior (${toDeletableMediaPath(previousUrl)}). Guardá los cambios.`;
          } else if (cleanup.kept) {
            statusMsg = `${statusMsg} La imagen anterior se mantiene porque aún se usa en otro lugar.`;
          }
        } catch (cleanupError) {
          statusMsg = `${statusMsg} No se pudo borrar la anterior: ${cleanupError.message}`;
        }

        setStatus(statusMsg, "ok");
        renderTab();
      } catch (error) {
        setStatus(error.message, "err");
      }
    };
    input.click();
    return;
  }

  renderTab();
});

async function boot() {
  if (getToken()) {
    showApp();
    try {
      await loadContent();
      setStatus("Contenido cargado.");
    } catch (error) {
      setStatus(error.message, "err");
    }
  }
}

juntaAddMemberBtn?.addEventListener("click", () => {
  const members = readJuntaMemberRows();
  members.push({ name: "", role: "" });
  renderJuntaMemberRows(members);
});

juntaMembersList?.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-remove-member]");
  if (!btn) return;
  const row = btn.closest(".junta-member-row");
  row?.remove();
  if (!juntaMembersList.querySelector(".junta-member-row")) {
    renderJuntaMemberRows([{ name: "", role: "" }]);
  }
});

juntaOnboardingForm?.addEventListener("change", (event) => {
  const target = event.target;
  if (target?.name === "photoMode" && juntaPhotoUploadWrap) {
    juntaPhotoUploadWrap.hidden = target.value !== "upload";
  }
});

juntaOnboardingForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setJuntaOnboardingError("");
  const submitBtn = document.querySelector("#junta-onboarding-submit");
  const previousLabel = submitBtn?.textContent;
  try {
    const year = Number(juntaYearInput?.value);
    if (!Number.isInteger(year) || year < 2020 || year > 2100) {
      throw new Error("Indicá un año válido para la Junta (por ejemplo 2027).");
    }
    const members = readJuntaMemberRows().filter((m) => m.name && m.role);
    if (!members.length) {
      throw new Error("Agregá al menos una persona con nombre y puesto.");
    }
    const photoMode =
      juntaOnboardingForm.querySelector('input[name="photoMode"]:checked')?.value || "keep";
    const photoFile = juntaPhotoFile?.files?.[0] || null;
    if (photoMode === "upload" && !photoFile) {
      throw new Error("Seleccioná el archivo de la nueva foto grupal.");
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Guardando…";
    }
    setStatus("Actualizando Junta Directiva en todo el sitio…");
    await applyJuntaOnboarding({ year, members, photoMode, photoFile });
    const data = await persistContent();
    hideJuntaOnboarding();
    renderTab();
    const deployOk = !data.deploy || data.deploy === "triggered";
    setStatus(
      data.message ||
        `Junta ${year} guardada. El menú, el hero y la sección Junta ya apuntan al nuevo periodo.`,
      deployOk ? "ok" : "err",
    );
  } catch (error) {
    setJuntaOnboardingError(error.message || "No se pudo guardar la Junta.");
    setStatus(error.message || "No se pudo guardar la Junta.", "err");
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = previousLabel || "Guardar Junta y actualizar el sitio";
    }
  }
});

boot();
