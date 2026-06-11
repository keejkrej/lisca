/** Scroll to a landing section, offset by the measured sticky header height. */
export function scrollToSection(id: string) {
  const target = document.getElementById(id);
  if (!target) return;

  const header = document.querySelector("header");
  const offset = header?.getBoundingClientRect().height ?? 64;
  const top = target.getBoundingClientRect().top + window.scrollY - offset;

  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}
