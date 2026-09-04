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
