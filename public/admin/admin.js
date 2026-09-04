const TOKEN_KEY = "aseati_admin_token";
const SHA_KEY = "aseati_admin_sha";

const loginView = document.querySelector("#login-view");
const appView = document.querySelector("#app-view");
const loginForm = document.querySelector("#login-form");
const loginError = document.querySelector("#login-error");
const editor = document.querySelector("#editor");
const statusEl = document.querySelector("#status");
const saveBtn = document.querySelector("#save-btn");
const logoutBtn = document.querySelector("#logout-btn");

let content = null;
let activeTab = "hero";

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
  statusEl.textContent = message || "";
  statusEl.className = `status ${type}`.trim();
}

function field(label, key, value, multiline = false) {
  const id = `f-${key.replaceAll(".", "-")}`;
  if (multiline) {
    return `<div class="field"><label for="${id}">${label}</label><textarea id="${id}" data-key="${key}">${escapeAttr(value)}</textarea></div>`;
  }
  return `<div class="field"><label for="${id}">${label}</label><input id="${id}" data-key="${key}" value="${escapeAttr(value)}" /></div>`;
}

function escapeAttr(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function readFields(root = editor) {
  root.querySelectorAll("[data-key]").forEach((el) => {
    const key = el.getAttribute("data-key");
    setPath(content, key, el.value);
  });
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

function paragraphsEditor(baseKey, paragraphs) {
  return `
    <div class="list" data-list="paragraphs" data-base="${baseKey}">
      ${(paragraphs ?? [])
        .map(
          (p, i) => `
        <div class="item" data-index="${i}">
          ${field(`Párrafo ${i + 1}`, `${baseKey}.${i}`, p, true)}
          <div class="item-actions">
            <button type="button" data-action="up">Subir</button>
            <button type="button" data-action="down">Bajar</button>
            <button type="button" class="danger" data-action="remove">Eliminar</button>
          </div>
        </div>`,
        )
        .join("")}
      <button type="button" class="primary" data-action="add-paragraph">Agregar párrafo</button>
    </div>`;
}

function featuresEditor(features) {
  return `
    <div class="list" data-list="features">
      ${(features ?? [])
        .map(
          (f, i) => `
        <div class="item" data-index="${i}">
          ${field("Título", `queHacemos.features.${i}.title`, f.title)}
          ${field("Texto", `queHacemos.features.${i}.text`, f.text, true)}
          <div class="item-actions">
            <button type="button" data-action="up">Subir</button>
            <button type="button" data-action="down">Bajar</button>
            <button type="button" class="danger" data-action="remove">Eliminar</button>
          </div>
        </div>`,
        )
        .join("")}
      <button type="button" class="primary" data-action="add-feature">Agregar ítem</button>
    </div>`;
}

function photosEditor(basePath, photos, withClass = false) {
  return `
    <div class="list" data-list="photos" data-base="${basePath}">
      ${(photos ?? [])
        .map(
          (p, i) => `
        <div class="item" data-index="${i}">
          ${field("URL imagen", `${basePath}.${i}.src`, p.src)}
          ${field("Texto alternativo", `${basePath}.${i}.alt`, p.alt)}
          ${withClass ? field("Clase (mosaic-tall / mosaic-wide / vacío)", `${basePath}.${i}.className`, p.className || "") : ""}
          <div class="item-actions">
            <button type="button" data-action="upload">Subir imagen</button>
            <button type="button" data-action="up">Subir</button>
            <button type="button" data-action="down">Bajar</button>
            <button type="button" class="danger" data-action="remove">Eliminar</button>
          </div>
        </div>`,
        )
        .join("")}
      <button type="button" class="primary" data-action="add-photo">Agregar foto</button>
    </div>`;
}

function rolesEditor(roles) {
  return `
    <div class="list" data-list="roles">
      ${(roles ?? [])
        .map(
          (r, i) => `
        <div class="item" data-index="${i}">
          ${field("Puesto", `puestos.roles.${i}.title`, r.title)}
          ${field("Descripción", `puestos.roles.${i}.text`, r.text, true)}
          <div class="item-actions">
            <button type="button" data-action="up">Subir</button>
            <button type="button" data-action="down">Bajar</button>
            <button type="button" class="danger" data-action="remove">Eliminar</button>
          </div>
        </div>`,
        )
        .join("")}
      <button type="button" class="primary" data-action="add-role">Agregar puesto</button>
    </div>`;
}

function membersEditor(members) {
  return `
    <div class="list" data-list="members">
      ${(members ?? [])
        .map(
          (m, i) => `
        <div class="item" data-index="${i}">
          ${field("Nombre", `junta.members.${i}.name`, m.name)}
          ${field("Puesto", `junta.members.${i}.role`, m.role)}
          <div class="item-actions">
            <button type="button" data-action="up">Subir</button>
            <button type="button" data-action="down">Bajar</button>
            <button type="button" class="danger" data-action="remove">Eliminar</button>
          </div>
        </div>`,
        )
        .join("")}
      <button type="button" class="primary" data-action="add-member">Agregar miembro</button>
    </div>`;
}

function remodelEditor(steps) {
  return `
    <div class="list" data-list="steps">
      ${(steps ?? [])
        .map(
          (s, i) => `
        <div class="item" data-index="${i}">
          ${field("URL imagen", `remodelacion.steps.${i}.src`, s.src)}
          ${field("Texto alternativo", `remodelacion.steps.${i}.alt`, s.alt)}
          ${field("Pie de foto", `remodelacion.steps.${i}.caption`, s.caption)}
          <div class="item-actions">
            <button type="button" data-action="upload-remodel">Subir imagen</button>
            <button type="button" data-action="up">Subir</button>
            <button type="button" data-action="down">Bajar</button>
            <button type="button" class="danger" data-action="remove">Eliminar</button>
          </div>
        </div>`,
        )
        .join("")}
      <button type="button" class="primary" data-action="add-step">Agregar paso</button>
    </div>`;
}

function renderTab() {
  if (!content) return;
  const c = content;
  let html = "";

  if (activeTab === "hero") {
    html = `<section class="panel"><h2>Hero</h2>
      ${field("Título", "hero.title", c.hero.title, true)}
      ${field("Texto introductorio", "hero.lead", c.hero.lead, true)}
      ${field("Logo (URL)", "hero.logoSrc", c.hero.logoSrc)}
      ${field("Alt del logo", "hero.logoAlt", c.hero.logoAlt)}
      ${field("CTA principal · texto", "hero.primaryCta.label", c.hero.primaryCta.label)}
      ${field("CTA principal · enlace", "hero.primaryCta.href", c.hero.primaryCta.href)}
      ${field("CTA secundario · texto", "hero.secondaryCta.label", c.hero.secondaryCta.label)}
      ${field("CTA secundario · enlace", "hero.secondaryCta.href", c.hero.secondaryCta.href)}
    </section>`;
  }

  if (activeTab === "queEs") {
    html = `<section class="panel"><h2>Qué es ASEATI</h2>
      ${field("Eyebrow", "queEs.eyebrow", c.queEs.eyebrow)}
      ${field("Título", "queEs.title", c.queEs.title)}
      ${field("Lead", "queEs.lead", c.queEs.lead, true)}
      <h3>Párrafos</h3>
      ${paragraphsEditor("queEs.paragraphs", c.queEs.paragraphs)}
      <h3>Imagen</h3>
      ${field("URL", "queEs.image.src", c.queEs.image.src)}
      ${field("Alt", "queEs.image.alt", c.queEs.image.alt)}
      ${field("Pie", "queEs.image.caption", c.queEs.image.caption)}
      <div class="item-actions"><button type="button" data-action="upload-single" data-target="queEs.image.src">Subir imagen</button></div>
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
      <h3>Roles</h3>
      ${rolesEditor(c.puestos.roles)}
    </section>`;
  }

  if (activeTab === "junta") {
    html = `<section class="panel"><h2>Junta Directiva</h2>
      ${field("Eyebrow", "junta.eyebrow", c.junta.eyebrow)}
      ${field("Título", "junta.title", c.junta.title)}
      ${field("Lead", "junta.lead", c.junta.lead, true)}
      <h3>Foto grupal</h3>
      ${field("URL", "junta.photo.src", c.junta.photo.src)}
      ${field("Alt", "junta.photo.alt", c.junta.photo.alt)}
      ${field("Pie", "junta.photo.caption", c.junta.photo.caption)}
      <div class="item-actions"><button type="button" data-action="upload-single" data-target="junta.photo.src">Subir imagen</button></div>
      <h3>Miembros</h3>
      ${membersEditor(c.junta.members)}
    </section>`;
  }

  if (activeTab === "tiendati") {
    html = `<section class="panel"><h2>TiendAti</h2>
      ${field("Eyebrow", "tiendati.eyebrow", c.tiendati.eyebrow)}
      ${field("Título", "tiendati.title", c.tiendati.title)}
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
      ${field("URL del PDF", "reglamento.pdfUrl", c.reglamento.pdfUrl)}
      ${field("Nombre de descarga", "reglamento.pdfDownloadName", c.reglamento.pdfDownloadName)}
      ${field("Texto botón abrir", "reglamento.openLabel", c.reglamento.openLabel)}
      ${field("Texto botón descargar", "reglamento.downloadLabel", c.reglamento.downloadLabel)}
      <div class="item-actions"><button type="button" data-action="upload-pdf" data-target="reglamento.pdfUrl">Subir PDF</button></div>
      <p class="hint">Podés subir un PDF nuevo; luego guardá los cambios para publicar.</p>
    </section>`;
  }

  if (activeTab === "footer") {
    html = `<section class="panel"><h2>Contacto / Footer</h2>
      ${field("Texto institucional", "footer.blurb", c.footer.blurb, true)}
      ${field("Etiqueta contacto", "footer.contactLabel", c.footer.contactLabel)}
      ${field("Correo", "footer.email", c.footer.email)}
      ${field("Instagram (handle sin @)", "footer.instagramHandle", c.footer.instagramHandle)}
      ${field("Instagram URL", "footer.instagramUrl", c.footer.instagramUrl)}
      ${field("WhatsApp (texto)", "footer.whatsappDisplay", c.footer.whatsappDisplay)}
      ${field("WhatsApp URL", "footer.whatsappUrl", c.footer.whatsappUrl)}
      ${field("Texto de copyright", "footer.copySuffix", c.footer.copySuffix)}
      ${field("Meta título", "meta.title", c.meta.title)}
      ${field("Meta descripción", "meta.description", c.meta.description, true)}
    </section>`;
  }

  editor.innerHTML = html;
}

function syncFromDom() {
  readFields();
}

function moveItem(arr, index, dir) {
  const target = index + dir;
  if (target < 0 || target >= arr.length) return;
  const [item] = arr.splice(index, 1);
  arr.splice(target, 0, item);
}

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(path, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Error ${response.status}`);
  return data;
}

async function loadContent() {
  // Prefer API (with sha). Fallback to static JSON for local/dev without GitHub.
  try {
    const data = await api("/api/content");
    content = data.content;
    if (data.sha) sessionStorage.setItem(SHA_KEY, data.sha);
  } catch {
    const response = await fetch("/data/site.json", { cache: "no-store" });
    if (!response.ok) throw new Error("No se pudo cargar el contenido.");
    content = await response.json();
  }
  renderTab();
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

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginError.hidden = true;
  try {
    const password = document.querySelector("#password").value;
    const data = await api("/api/auth", {
      method: "POST",
      body: JSON.stringify({ password }),
    });
    setToken(data.token);
    showApp();
    setStatus("Sesión iniciada.");
    await loadContent();
  } catch (error) {
    loginError.textContent = error.message;
    loginError.hidden = false;
  }
});

logoutBtn.addEventListener("click", () => {
  clearSession();
  content = null;
  showLogin();
  setStatus("");
});

saveBtn.addEventListener("click", async () => {
  try {
    syncFromDom();
    setStatus("Guardando…");
    const data = await api("/api/content", {
      method: "PUT",
      body: JSON.stringify({
        content,
        sha: sessionStorage.getItem(SHA_KEY) || undefined,
      }),
    });
    if (data.sha) sessionStorage.setItem(SHA_KEY, data.sha);
    setStatus(data.message || "Guardado.", "ok");
  } catch (error) {
    setStatus(error.message, "err");
  }
});

document.querySelectorAll("[data-tab]").forEach((btn) => {
  btn.addEventListener("click", () => {
    syncFromDom();
    activeTab = btn.getAttribute("data-tab");
    document.querySelectorAll("[data-tab]").forEach((b) => b.classList.toggle("active", b === btn));
    renderTab();
  });
});

editor.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const action = button.getAttribute("data-action");
  syncFromDom();

  const item = button.closest(".item");
  const index = item ? Number(item.getAttribute("data-index")) : -1;

  if (action === "add-paragraph") {
    const base = button.closest("[data-base]")?.getAttribute("data-base");
    if (base === "queEs.paragraphs") content.queEs.paragraphs.push("");
    if (base === "quienesSomos.paragraphs") content.quienesSomos.paragraphs.push("");
  }
  if (action === "add-feature") content.queHacemos.features.push({ title: "", text: "" });
  if (action === "add-role") content.puestos.roles.push({ title: "", text: "" });
  if (action === "add-member") content.junta.members.push({ name: "", role: "" });
  if (action === "add-photo") {
    const base = button.closest("[data-base]")?.getAttribute("data-base");
    const empty = { src: "", alt: "", className: "" };
    if (base === "queHacemos.photos") content.queHacemos.photos.push(empty);
    if (base === "quienesSomos.photos") content.quienesSomos.photos.push({ src: "", alt: "" });
    if (base === "tiendati.photos") content.tiendati.photos.push({ src: "", alt: "" });
  }
  if (action === "add-step") {
    content.remodelacion.steps.push({ src: "", alt: "", caption: "" });
  }

  if (action === "remove" && index >= 0) {
    if (!confirm("¿Eliminar este elemento?")) return;
    const list = button.closest("[data-list]")?.getAttribute("data-list");
    const base = button.closest("[data-base]")?.getAttribute("data-base");
    if (list === "paragraphs" && base === "queEs.paragraphs") content.queEs.paragraphs.splice(index, 1);
    if (list === "paragraphs" && base === "quienesSomos.paragraphs") content.quienesSomos.paragraphs.splice(index, 1);
    if (list === "features") content.queHacemos.features.splice(index, 1);
    if (list === "roles") content.puestos.roles.splice(index, 1);
    if (list === "members") content.junta.members.splice(index, 1);
    if (list === "photos" && base === "queHacemos.photos") content.queHacemos.photos.splice(index, 1);
    if (list === "photos" && base === "quienesSomos.photos") content.quienesSomos.photos.splice(index, 1);
    if (list === "photos" && base === "tiendati.photos") content.tiendati.photos.splice(index, 1);
    if (list === "steps") content.remodelacion.steps.splice(index, 1);
  }

  if ((action === "up" || action === "down") && index >= 0) {
    const dir = action === "up" ? -1 : 1;
    const list = button.closest("[data-list]")?.getAttribute("data-list");
    const base = button.closest("[data-base]")?.getAttribute("data-base");
    if (list === "paragraphs" && base === "queEs.paragraphs") moveItem(content.queEs.paragraphs, index, dir);
    if (list === "paragraphs" && base === "quienesSomos.paragraphs") moveItem(content.quienesSomos.paragraphs, index, dir);
    if (list === "features") moveItem(content.queHacemos.features, index, dir);
    if (list === "roles") moveItem(content.puestos.roles, index, dir);
    if (list === "members") moveItem(content.junta.members, index, dir);
    if (list === "photos" && base === "queHacemos.photos") moveItem(content.queHacemos.photos, index, dir);
    if (list === "photos" && base === "quienesSomos.photos") moveItem(content.quienesSomos.photos, index, dir);
    if (list === "photos" && base === "tiendati.photos") moveItem(content.tiendati.photos, index, dir);
    if (list === "steps") moveItem(content.remodelacion.steps, index, dir);
  }

  if (action === "upload" || action === "upload-remodel" || action === "upload-single" || action === "upload-pdf") {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = action === "upload-pdf" ? "application/pdf" : "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        setStatus("Subiendo archivo…");
        const folder = action === "upload-remodel" ? "remodelacion" : "gallery";
        const result = await uploadFile(file, folder);
        if (action === "upload-single" || action === "upload-pdf") {
          const target = button.getAttribute("data-target");
          setPath(content, target, result.url);
        } else if (action === "upload" && index >= 0) {
          const base = button.closest("[data-base]")?.getAttribute("data-base");
          if (base === "queHacemos.photos") content.queHacemos.photos[index].src = result.url;
          if (base === "quienesSomos.photos") content.quienesSomos.photos[index].src = result.url;
          if (base === "tiendati.photos") content.tiendati.photos[index].src = result.url;
        } else if (action === "upload-remodel" && index >= 0) {
          content.remodelacion.steps[index].src = result.url;
        }
        setStatus(result.message || "Archivo subido.", "ok");
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

boot();
