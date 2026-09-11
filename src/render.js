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

function setMetaContent(selector, value) {
  const el = document.querySelector(selector);
  if (el && value != null) el.setAttribute("content", value);
}

export function renderSite(data) {
  if (!data) return;

  if (data.meta?.title) {
    document.title = data.meta.title;
    setMetaContent('meta[property="og:title"]', data.meta.title);
    setMetaContent('meta[name="twitter:title"]', data.meta.title);
  }
  if (data.meta?.description) {
    setMetaContent('meta[name="description"]', data.meta.description);
    setMetaContent('meta[property="og:description"]', data.meta.description);
    setMetaContent('meta[name="twitter:description"]', data.meta.description);
  }
  if (data.meta?.ogImage) {
    setMetaContent('meta[property="og:image"]', data.meta.ogImage);
    setMetaContent('meta[name="twitter:image"]', data.meta.ogImage);
  }
  if (data.meta?.siteUrl) {
    const siteUrl = String(data.meta.siteUrl).replace(/\/$/, "") + "/";
    setAttr('link[rel="canonical"]', "href", siteUrl);
    setMetaContent('meta[property="og:url"]', siteUrl);
  }

  renderNav(data.nav);

  const hero = data.hero ?? {};
  setAttr(".hero-logo", "src", hero.logoSrc);
  setAttr(".hero-logo", "alt", hero.logoAlt);
  setAttr(".footer-logo", "src", hero.logoSrc || "/logo-aseati.png");
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

  const carreraAti = data.carreraAti ?? {};
  setText("#carrera-ati .eyebrow", carreraAti.eyebrow);
  setText("#carrera-ati h2", carreraAti.title);
  setText("#carrera-ati .section-lead", carreraAti.lead);
  setHtml(
    "#carrera-ati > .section-inner > .prose",
    (carreraAti.paragraphs ?? []).map((p) => `<p>${escapeHtml(p)}</p>`).join(""),
  );
  setText("#carrera-ati .ati-role h3", carreraAti.roleTitle);
  setText("#carrera-ati .ati-role p", carreraAti.roleText);
  setHtml(
    "#carrera-ati .ati-facts",
    (carreraAti.facts ?? [])
      .map(
        (fact) =>
          `<li><strong>${escapeHtml(fact.value)}</strong><span>${escapeHtml(fact.label)}</span></li>`,
      )
      .join(""),
  );
  const planTitle = document.querySelector('[data-ati="plan-title"]');
  const planLead = document.querySelector('[data-ati="plan-lead"]');
  const planList = document.querySelector('[data-ati="plan-list"]');
  const careersTitle = document.querySelector('[data-ati="careers-title"]');
  const careersLead = document.querySelector('[data-ati="careers-lead"]');
  const careersList = document.querySelector('[data-ati="careers-list"]');
  if (planTitle) planTitle.textContent = carreraAti.planTitle ?? "";
  if (planLead) planLead.textContent = carreraAti.planLead ?? "";
  if (planList) {
    planList.innerHTML = (carreraAti.planAreas ?? [])
      .map(
        (item) =>
          `<li><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.text)}</span></li>`,
      )
      .join("");
  }
  if (careersTitle) careersTitle.textContent = carreraAti.careersTitle ?? "";
  if (careersLead) careersLead.textContent = carreraAti.careersLead ?? "";
  if (careersList) {
    careersList.innerHTML = (carreraAti.careers ?? [])
      .map(
        (item) =>
          `<li><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.text)}</span></li>`,
      )
      .join("");
  }
  const atiCta = document.querySelector("#carrera-ati .ati-cta-wrap a");
  if (atiCta) {
    atiCta.textContent = carreraAti.ctaLabel ?? "Ver la carrera en el TEC";
    atiCta.setAttribute("href", carreraAti.ctaHref ?? "#");
  }

  const acred = data.acreditacion ?? {};
  setText("#acreditacion .eyebrow", acred.eyebrow);
  setText("#acreditacion h2", acred.title);
  setText("#acreditacion .section-lead", acred.lead);
  setHtml(
    "#acreditacion .acred-stats",
    (acred.stats ?? [])
      .map(
        (stat) =>
          `<li><strong>${escapeHtml(stat.value)}</strong><span>${escapeHtml(stat.label)}</span></li>`,
      )
      .join(""),
  );
  setHtml(
    "#acreditacion .prose",
    (acred.paragraphs ?? []).map((p) => `<p>${escapeHtml(p)}</p>`).join(""),
  );
  const quoteEl = document.querySelector("#acreditacion .acred-quote");
  if (quoteEl && acred.quote) {
    const quoteText = quoteEl.querySelector("p");
    const quoteAuthor = quoteEl.querySelector("cite");
    const quoteRole = quoteEl.querySelector("footer span");
    if (quoteText) quoteText.textContent = `“${acred.quote.text ?? ""}”`;
    if (quoteAuthor) quoteAuthor.textContent = acred.quote.author ?? "";
    if (quoteRole) quoteRole.textContent = acred.quote.role ?? "";
  }
  const acredPhotos = document.querySelector("#acreditacion .acred-photos");
  if (acredPhotos) {
    const photos = acred.photos ?? [];
    if (photos.length) {
      acredPhotos.hidden = false;
      acredPhotos.innerHTML = photos
        .map(
          (photo) =>
            `<figure class="media-frame"><img src="${escapeHtml(photo.src)}" alt="${escapeHtml(photo.alt)}" loading="lazy" /></figure>`,
        )
        .join("");
    } else {
      acredPhotos.hidden = true;
      acredPhotos.innerHTML = "";
    }
  }
  setText("#acreditacion .acred-links-label", acred.linksLabel ?? "Más información y noticias");
  setHtml(
    "#acreditacion .acred-links ul",
    (acred.links ?? [])
      .map(
        (link) =>
          `<li><a href="${escapeHtml(link.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)}</a></li>`,
      )
      .join(""),
  );

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

  const fiestas = data.fiestasAti ?? {};
  setText("#fiestas-ati .eyebrow", fiestas.eyebrow);
  setText("#fiestas-ati h2", fiestas.title);
  setText("#fiestas-ati .section-lead", fiestas.lead);
  setHtml(
    "#fiestas-ati .prose",
    (fiestas.paragraphs ?? []).map((p) => `<p>${escapeHtml(p)}</p>`).join(""),
  );
  setText("#fiestas-ati .fiestas-note", fiestas.note);
  setHtml(
    "#fiestas-ati .photo-mosaic",
    (fiestas.photos ?? [])
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
  setText("#puestos .puestos-intro p", puestos.intro);
  setText("#puestos .puestos-requirements h3", puestos.requirementsTitle);
  setHtml(
    "#puestos .puestos-requirements ol",
    (puestos.requirements ?? [])
      .map((item) => `<li>${escapeHtml(item)}</li>`)
      .join(""),
  );
  const puestosNote = document.querySelector("#puestos .puestos-note");
  if (puestosNote && puestos.noteHtml) puestosNote.innerHTML = puestos.noteHtml;
  setText("#puestos .puestos-roles-title", puestos.rolesTitle);
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
  const juntaYear = junta.year || extractYearFromText(junta.title) || "";
  const juntaHeading = junta.title || (juntaYear ? `Junta Directiva ${juntaYear}` : "Junta Directiva");
  setText("#junta .eyebrow", junta.eyebrow);
  setText("#junta h2", juntaHeading);
  setText("#junta .section-lead", junta.lead);
  const juntaFigure = document.querySelector("#junta .media-feature");
  const juntaPhoto = junta.photo ?? {};
  const hideJuntaPhoto = Boolean(juntaPhoto.hidden) || !String(juntaPhoto.src || "").trim();
  if (juntaFigure) juntaFigure.hidden = hideJuntaPhoto;
  if (!hideJuntaPhoto) {
    setAttr("#junta .media-feature img", "src", juntaPhoto.src);
    setAttr("#junta .media-feature img", "alt", juntaPhoto.alt);
    setText("#junta .media-feature figcaption", juntaPhoto.caption);
  }
  setAttr("#junta .table-wrap", "aria-label", juntaHeading);
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
  setAttr("#tiendati .tiendati-logo", "src", tiendati.logoSrc || "/logo-tiendati.png");
  setAttr("#tiendati .tiendati-logo", "alt", tiendati.logoAlt || "Logo de TIENDATI");
  setText("#tiendati .tiendati-title", tiendati.title);
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

  // Keep nav label in sync with TIENDATI title when present
  const tiendaNav = document.querySelector('#site-nav a[href="#tiendati"]');
  if (tiendaNav && tiendati.title) tiendaNav.textContent = tiendati.title;

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
    const pdfUrl = reglamento.pdfUrl ?? "";
    // Keep PDF out of iframe src until desktop preview loads it.
    // Mobile browsers often force-download PDFs embedded in iframes.
    iframe.removeAttribute("src");
    iframe.setAttribute("data-src", pdfUrl ? `${pdfUrl}#view=FitH` : "");
    iframe.setAttribute("title", reglamento.title ?? "Reglamento");
  }
  if (fallbackLink) fallbackLink.setAttribute("href", reglamento.pdfUrl ?? "#");

  const consultas = data.consultas ?? {};
  setText("#consultas .eyebrow", consultas.eyebrow);
  setText("#consultas h2", consultas.title);
  setText("#consultas .section-lead", consultas.lead);
  setText("#consultas-form legend", consultas.modeLegend || "¿Cómo querés enviarlo?");
  const identifiedLabel = document.querySelector('#consultas input[value="identified"] + span');
  const anonymousLabel = document.querySelector('#consultas input[value="anonymous"] + span');
  if (identifiedLabel) identifiedLabel.textContent = consultas.identifiedLabel ?? "Con mis datos";
  if (anonymousLabel) anonymousLabel.textContent = consultas.anonymousLabel ?? "Anónimo";
  setText('#consultas [data-privacy="identified"]', consultas.identifiedNote);
  setText('#consultas [data-privacy="anonymous"]', consultas.anonymousNote);
  setText('[data-consultas-label="topic"]', consultas.topicLabel || "Tipo de mensaje");
  setText('[data-consultas-label="name"]', consultas.nameLabel || "Nombre");
  setText('[data-consultas-label="email"]', consultas.emailLabel || "Correo (opcional)");
  setText('[data-consultas-label="message"]', consultas.messageLabel || "Mensaje");
  setAttr('#consultas-form input[name="name"]', "placeholder", consultas.namePlaceholder || "Tu nombre");
  setAttr('#consultas-form input[name="email"]', "placeholder", consultas.emailPlaceholder || "para poder responderte");
  setAttr('#consultas-form textarea[name="message"]', "placeholder", consultas.messagePlaceholder || "");
  const topicSelect = document.querySelector('#consultas-form select[name="topic"]');
  if (topicSelect && Array.isArray(consultas.topics) && consultas.topics.length) {
    topicSelect.innerHTML = consultas.topics
      .map(
        (topic) =>
          `<option value="${escapeHtml(topic.value)}">${escapeHtml(topic.label || topic.value)}</option>`,
      )
      .join("");
  }
  const submitBtn = document.querySelector("#consultas-form button[type=submit]");
  if (submitBtn) submitBtn.textContent = consultas.submitLabel ?? "Enviar a ASEATI";

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

function extractYearFromText(value) {
  const match = String(value || "").match(/\b(20\d{2})\b/);
  return match ? Number(match[1]) : null;
}

function renderNav(nav) {
  const root = document.querySelector("#site-nav");
  if (!root || !nav) return;

  const groups = nav.groups ?? [];
  const directLinks = nav.directLinks ?? [];
  if (!groups.length && !directLinks.length) return;

  const groupsHtml = groups
    .map((group, index) => {
      const id = group.id || `nav-group-${index}`;
      const submenuId = `nav-${id}`;
      const links = (group.links ?? [])
        .map((link) => `<a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>`)
        .join("");
      return `
        <div class="nav-group">
          <button
            type="button"
            class="nav-group-toggle"
            aria-expanded="false"
            aria-controls="${escapeHtml(submenuId)}"
          >
            ${escapeHtml(group.label)}
          </button>
          <div id="${escapeHtml(submenuId)}" class="nav-submenu" role="group" hidden>
            ${links}
          </div>
        </div>`;
    })
    .join("");

  const directHtml = directLinks
    .map(
      (link) =>
        `<a class="nav-link-direct" href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>`,
    )
    .join("");

  root.innerHTML = `${groupsHtml}${directHtml}`;
}

export async function loadSiteContent() {
  const response = await fetch("/data/site.json", { cache: "no-store" });
  if (!response.ok) throw new Error("No se pudo cargar el contenido del sitio.");
  return response.json();
}
