import "./style.css";

const nav = document.querySelector("#site-nav");
const toggle = document.querySelector(".nav-toggle");
const year = document.querySelector("[data-year]");

if (year) {
  year.textContent = String(new Date().getFullYear());
}

function setNavOpen(open) {
  if (!nav || !toggle) return;
  nav.classList.toggle("is-open", open);
  toggle.setAttribute("aria-expanded", open ? "true" : "false");
  toggle.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
}

toggle?.addEventListener("click", () => {
  const open = toggle.getAttribute("aria-expanded") !== "true";
  setNavOpen(open);
});

nav?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => setNavOpen(false));
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setNavOpen(false);
});

document.addEventListener("click", (event) => {
  if (!nav || !toggle) return;
  if (nav.classList.contains("is-open") && !nav.contains(event.target) && !toggle.contains(event.target)) {
    setNavOpen(false);
  }
});

const revealItems = document.querySelectorAll(
  ".section-inner, .media-frame, .mosaic-item, .feature-list li, .roles-grid article",
);

if (revealItems.length && "IntersectionObserver" in window) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduceMotion) {
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
}
