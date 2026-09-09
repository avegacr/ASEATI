import "./style.css";
import { loadSiteContent, renderSite } from "./render.js";

function setupNav() {
  const nav = document.querySelector("#site-nav");
  const toggle = document.querySelector(".nav-toggle");

  function groups() {
    return [...(nav?.querySelectorAll(".nav-group") ?? [])];
  }

  function setGroupOpen(group, open) {
    const button = group.querySelector(".nav-group-toggle");
    const submenu = group.querySelector(".nav-submenu");
    if (!button || !submenu) return;
    group.classList.toggle("is-open", open);
    button.setAttribute("aria-expanded", open ? "true" : "false");
    submenu.hidden = !open;
  }

  function closeAllGroups(except = null) {
    groups().forEach((group) => {
      if (group !== except) setGroupOpen(group, false);
    });
  }

  function setNavOpen(open) {
    if (!nav || !toggle) return;
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
    document.body.style.overflow = open ? "hidden" : "";
    if (!open) closeAllGroups();
  }

  toggle?.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") !== "true";
    setNavOpen(open);
  });

  // Delegation so nav rebuilt from JSON keeps working.
  nav?.addEventListener("click", (event) => {
    const button = event.target.closest(".nav-group-toggle");
    if (button && nav.contains(button)) {
      event.stopPropagation();
      const group = button.closest(".nav-group");
      if (!group) return;
      const willOpen = button.getAttribute("aria-expanded") !== "true";
      closeAllGroups(group);
      setGroupOpen(group, willOpen);
      return;
    }

    const link = event.target.closest("a");
    if (link && nav.contains(link)) setNavOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (groups().some((group) => group.classList.contains("is-open"))) {
        closeAllGroups();
        return;
      }
      setNavOpen(false);
    }
  });

  document.addEventListener("click", (event) => {
    if (!nav || !toggle) return;
    const insideNav = nav.contains(event.target) || toggle.contains(event.target);
    if (!insideNav) {
      closeAllGroups();
      if (nav.classList.contains("is-open")) setNavOpen(false);
    }
  });
}

function setupReveal() {
  const revealItems = document.querySelectorAll(
    ".section-inner, .media-frame, .mosaic-item, .feature-list li, .roles-grid article, .remodel-timeline li",
  );

  if (!revealItems.length || !("IntersectionObserver" in window)) return;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) return;

  revealItems.forEach((el) => el.classList.add("reveal"));
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
  );
  revealItems.forEach((el) => observer.observe(el));
}

function isDesktopPdfPreview() {
  return window.matchMedia("(min-width: 900px)").matches;
}

function loadPdfPreview() {
  const frame = document.querySelector("#reglamento .pdf-frame");
  const iframe = document.querySelector("#reglamento iframe");
  if (!frame || !iframe) return;
  const src = iframe.getAttribute("data-src");
  if (!src || !isDesktopPdfPreview()) {
    frame.classList.remove("has-preview");
    iframe.removeAttribute("src");
    return;
  }
  if (iframe.getAttribute("src") === src) {
    frame.classList.add("has-preview");
    return;
  }
  iframe.setAttribute("src", src);
  frame.classList.add("has-preview");
}

const WEB3FORMS_URL = "https://api.web3forms.com/submit";
const WEB3FORMS_ACCESS_KEY = "17d09763-004b-4a15-a027-6af492229f22";

function formatConsultasMessage(payload) {
  const mode = payload.anonymous ? "Anónimo" : "Con datos de contacto";
  return [
    `Tipo: ${payload.topic}`,
    `Modalidad: ${mode}`,
    `Nombre: ${payload.anonymous ? "No indicado (envío anónimo)" : payload.name}`,
    `Correo: ${payload.email || "No indicado"}`,
    "",
    "Mensaje:",
    payload.message,
  ].join("\n");
}

async function sendConsultasWithWeb3Forms(payload) {
  const mode = payload.anonymous ? "Anónimo" : "Con datos de contacto";
  const response = await fetch(WEB3FORMS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      access_key: WEB3FORMS_ACCESS_KEY,
      subject: `[ASEATI] ${payload.topic} · ${mode}`,
      from_name: "Buzón ASEATI",
      name: payload.anonymous ? "Estudiante anónimo" : payload.name,
      email:
        payload.email ||
        `anonimo@${window.location.hostname.replace(/^www\./, "")}`,
      replyto: payload.email || undefined,
      botcheck: false,
      message: formatConsultasMessage(payload),
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 429) {
    throw new Error("Hay muchos envíos seguidos. Esperá un rato y volvé a intentar.");
  }
  if (!response.ok || data.success !== true) {
    throw new Error(
      data.message ||
        "No se pudo enviar el mensaje. Intentá de nuevo o escribinos a aseati@estudiantec.cr.",
    );
  }
}

function setupConsultasForm() {
  const form = document.querySelector("#consultas-form");
  if (!form) return;

  const nameField = form.querySelector(".consultas-name-field");
  const nameInput = form.querySelector('[name="name"]');
  const identifiedNote = form.querySelector('[data-privacy="identified"]');
  const anonymousNote = form.querySelector('[data-privacy="anonymous"]');
  const statusEl = form.querySelector(".consultas-status");
  const submit = form.querySelector('button[type="submit"]');
  const submitLabel = submit?.textContent || "Enviar a ASEATI";

  function isAnonymous() {
    return form.querySelector('input[name="mode"]:checked')?.value === "anonymous";
  }

  function setMode() {
    const anonymous = isAnonymous();
    if (nameField) nameField.hidden = anonymous;
    if (identifiedNote) identifiedNote.hidden = anonymous;
    if (anonymousNote) anonymousNote.hidden = !anonymous;
    if (nameInput) {
      nameInput.required = !anonymous;
      nameInput.disabled = anonymous;
      if (anonymous) nameInput.value = "";
    }
    form.querySelectorAll(".consultas-mode").forEach((label) => {
      const input = label.querySelector("input");
      label.classList.toggle("is-active", !!input?.checked);
    });
  }

  function setStatus(message, type = "") {
    if (!statusEl) return;
    statusEl.hidden = !message;
    statusEl.textContent = message;
    statusEl.classList.toggle("is-ok", type === "ok");
    statusEl.classList.toggle("is-err", type === "err");
  }

  form.querySelectorAll('input[name="mode"]').forEach((input) => {
    input.addEventListener("change", setMode);
  });
  setMode();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const anonymous = isAnonymous();
    const honeypot = form.querySelector('[name="aseati_hp"]')?.value?.trim();
    const payload = {
      anonymous,
      topic: form.topic.value,
      name: anonymous ? "" : form.name.value.trim(),
      email: form.email.value.trim(),
      message: form.message.value.trim(),
    };

    if (payload.message.length < 10) {
      setStatus("El mensaje es muy corto. Contanos un poco más.", "err");
      form.message.focus();
      return;
    }
    if (!anonymous && !payload.name) {
      setStatus("Indicá tu nombre o cambiá a envío anónimo.", "err");
      nameInput?.focus();
      return;
    }

    if (submit) {
      submit.disabled = true;
      submit.textContent = "Enviando…";
    }
    setStatus("Enviando tu mensaje…");

    try {
      if (honeypot) {
        setStatus(
          "No se pudo enviar el mensaje. Intentá de nuevo o escribinos a aseati@estudiantec.cr.",
          "err",
        );
        return;
      }
      await sendConsultasWithWeb3Forms(payload);
      form.reset();
      const identified = form.querySelector('input[name="mode"][value="identified"]');
      if (identified) identified.checked = true;
      setMode();
      setStatus("Tu mensaje ya se envió a ASEATI. Gracias por escribirnos.", "ok");
    } catch (error) {
      setStatus(
        error.message ||
          "No se pudo enviar el mensaje. Intentá de nuevo o escribinos a aseati@estudiantec.cr.",
        "err",
      );
    } finally {
      if (submit) {
        submit.disabled = false;
        submit.textContent = submitLabel;
      }
    }
  });
}

function setupPdfPreview() {
  loadPdfPreview();

  const media = window.matchMedia("(min-width: 900px)");
  const onChange = () => loadPdfPreview();
  if (typeof media.addEventListener === "function") {
    media.addEventListener("change", onChange);
  } else if (typeof media.addListener === "function") {
    media.addListener(onChange);
  }
}

async function boot() {
  const year = document.querySelector("[data-year]");
  if (year) year.textContent = String(new Date().getFullYear());

  setupNav();

  try {
    const data = await loadSiteContent();
    renderSite(data);
  } catch (error) {
    console.error(error);
  }

  setupConsultasForm();
  setupPdfPreview();
  setupReveal();
}

boot();
