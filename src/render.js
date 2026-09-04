function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function setText(selector, value) {
  const el = document.querySelector(selector);
  if (el) el.textContent = value ?? "";
}

function setHtml(selector, html) {
  const el = document.querySelector(selector);
  if (el) el.innerHTML = html;
}

function setAttr(selector, attr, value) {
  const el = document.querySelector(selector);
  if (el) el.setAttribute(attr, value ?? "");
}

export function renderSite(data) {
  if (!data) return;

  if (data.meta?.title) document.title = data.meta.title;
  const desc = document.querySelector('meta[name="description"]');
  if (desc && data.meta?.description) desc.setAttribute("content", data.meta.description);

  const hero = data.hero ?? {};
  setAttr(".hero-logo", "src", hero.logoSrc);
  setAttr(".hero-logo", "alt", hero.logoAlt);
  setText("#inicio h1", hero.title);
  setText(".hero-lead", hero.lead);
  const primary = document.querySelector(".hero-actions .btn-primary");
  const secondary = document.querySelector(".hero-actions .btn-secondary");
  if (primary && hero.primaryCta) {
    primary.textContent = hero.primaryCta.label;
    primary.setAttribute("href", hero.primaryCta.href);
  }
  if (secondary && hero.secondaryCta) {
    secondary.textContent = hero.secondaryCta.label;
    secondary.setAttribute("href", hero.secondaryCta.href);
  }

  const queEs = data.queEs ?? {};
  setText("#que-es .eyebrow", queEs.eyebrow);
  setText("#que-es h2", queEs.title);
  setText("#que-es .section-lead", queEs.lead);
  setHtml(
    "#que-es .prose",
    (queEs.paragraphs ?? []).map((p) => `<p>${escapeHtml(p)}</p>`).join(""),
  );
  if (queEs.image) {
    setAttr("#que-es .media-frame img", "src", queEs.image.src);
    setAttr("#que-es .media-frame img", "alt", queEs.image.alt);
    setText("#que-es .media-frame figcaption", queEs.image.caption);
  }

  const queHacemos = data.queHacemos ?? {};
  setText("#que-hacemos .eyebrow", queHacemos.eyebrow);
  setText("#que-hacemos h2", queHacemos.title);
  setText("#que-hacemos .section-lead", queHacemos.lead);
  setHtml(
    "#que-hacemos .feature-list",
    (queHacemos.features ?? [])
      .map(
        (f) =>
          `<li><strong>${escapeHtml(f.title)}</strong><span>${escapeHtml(f.text)}</span></li>`,
      )
      .join(""),
  );
  setHtml(
    "#que-hacemos .photo-mosaic",
    (queHacemos.photos ?? [])
      .map((photo) => {
        const cls = ["mosaic-item", photo.className].filter(Boolean).join(" ");
        return `<figure class="${cls}"><img src="${escapeHtml(photo.src)}" alt="${escapeHtml(photo.alt)}" loading="lazy" /></figure>`;
      })
      .join(""),
  );

  const quienes = data.quienesSomos ?? {};
  setText("#quienes-somos .eyebrow", quienes.eyebrow);
  setText("#quienes-somos h2", quienes.title);
  setText("#quienes-somos .section-lead", quienes.lead);
  setHtml(
    "#quienes-somos .prose",
    (quienes.paragraphs ?? []).map((p) => `<p>${escapeHtml(p)}</p>`).join(""),
  );
  setHtml(
    "#quienes-somos .photo-row",
    (quienes.photos ?? [])
      .map(
        (photo) =>
          `<figure class="media-frame"><img src="${escapeHtml(photo.src)}" alt="${escapeHtml(photo.alt)}" loading="lazy" /></figure>`,
      )
      .join(""),
  );

  const puestos = data.puestos ?? {};
  setText("#puestos .eyebrow", puestos.eyebrow);
  setText("#puestos h2", puestos.title);
  setText("#puestos .section-lead", puestos.lead);
  setHtml(
    "#puestos .roles-grid",
    (puestos.roles ?? [])
      .map(
        (role) =>
          `<article><h3>${escapeHtml(role.title)}</h3><p>${escapeHtml(role.text)}</p></article>`,
      )
      .join(""),
  );

  const junta = data.junta ?? {};
  setText("#junta .eyebrow", junta.eyebrow);
  setText("#junta h2", junta.title);
  setText("#junta .section-lead", junta.lead);
  if (junta.photo) {
    setAttr("#junta .media-feature img", "src", junta.photo.src);
    setAttr("#junta .media-feature img", "alt", junta.photo.alt);
    setText("#junta .media-feature figcaption", junta.photo.caption);
  }
  setHtml(
    "#junta .board-table tbody",
    (junta.members ?? [])
      .map(
        (member, index) =>
          `<tr><td>${index + 1}</td><td>${escapeHtml(member.name)}</td><td>${escapeHtml(member.role)}</td></tr>`,
      )
      .join(""),
  );

  const tiendati = data.tiendati ?? {};
  setText("#tiendati .eyebrow", tiendati.eyebrow);
  setText("#tiendati h2", tiendati.title);
  setText("#tiendati .section-lead", tiendati.lead);
  setText("#tiendati .tiendati-note", tiendati.note);
  setHtml(
    "#tiendati .photo-stack",
    (tiendati.photos ?? [])
      .map(
        (photo) =>
          `<figure class="media-frame"><img src="${escapeHtml(photo.src)}" alt="${escapeHtml(photo.alt)}" loading="lazy" /></figure>`,
      )
      .join(""),
  );

  const remodel = data.remodelacion ?? {};
  setText("#remodelacion .eyebrow", remodel.eyebrow);
  setText("#remodelacion h2", remodel.title);
  setText("#remodelacion .section-lead", remodel.lead);
  setHtml(
    "#remodelacion .remodel-timeline",
    (remodel.steps ?? [])
      .map(
        (step, index) => `
      <li>
        <figure>
          <img src="${escapeHtml(step.src)}" alt="${escapeHtml(step.alt)}" loading="lazy" />
          <figcaption><span>${index + 1}</span> ${escapeHtml(step.caption)}</figcaption>
        </figure>
      </li>`,
      )
      .join(""),
  );

  const reglamento = data.reglamento ?? {};
  setText("#reglamento .eyebrow", reglamento.eyebrow);
  setText("#reglamento h2", reglamento.title);
  setText("#reglamento .section-lead", reglamento.lead);
  const openBtn = document.querySelector("#reglamento .btn-primary");
  const downloadBtn = document.querySelector("#reglamento .btn-secondary");
  const iframe = document.querySelector("#reglamento iframe");
  const fallbackLink = document.querySelector("#reglamento .pdf-fallback a");
  if (openBtn) {
    openBtn.textContent = reglamento.openLabel ?? "Abrir PDF";
    openBtn.setAttribute("href", reglamento.pdfUrl ?? "#");
  }
  if (downloadBtn) {
    downloadBtn.textContent = reglamento.downloadLabel ?? "Descargar";
    downloadBtn.setAttribute("href", reglamento.pdfUrl ?? "#");
    downloadBtn.setAttribute("download", reglamento.pdfDownloadName ?? "reglamento.pdf");
  }
  if (iframe) {
    iframe.setAttribute("src", `${reglamento.pdfUrl ?? ""}#view=FitH`);
    iframe.setAttribute("title", reglamento.title ?? "Reglamento");
  }
  if (fallbackLink) fallbackLink.setAttribute("href", reglamento.pdfUrl ?? "#");

  const footer = data.footer ?? {};
  setText(".footer-brand p", footer.blurb);
  setText(".footer-label", footer.contactLabel ?? "Contacto");
  const emailLink = document.querySelector("[data-contact=email]");
  const igLink = document.querySelector("[data-contact=instagram]");
  const waLink = document.querySelector("[data-contact=whatsapp]");
  if (emailLink) {
    emailLink.textContent = footer.email ?? "";
    emailLink.setAttribute("href", `mailto:${footer.email ?? ""}`);
  }
  if (igLink) {
    igLink.textContent = `@${footer.instagramHandle ?? ""}`;
    igLink.setAttribute("href", footer.instagramUrl ?? "#");
  }
  if (waLink) {
    waLink.textContent = footer.whatsappDisplay ?? "";
    waLink.setAttribute("href", footer.whatsappUrl ?? "#");
  }
  setText("[data-copy-suffix]", footer.copySuffix ?? "");
}

export async function loadSiteContent() {
  const response = await fetch("/data/site.json", { cache: "no-store" });
  if (!response.ok) throw new Error("No se pudo cargar el contenido del sitio.");
  return response.json();
}
