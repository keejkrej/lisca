import { useEffect } from "react";
import { useLatest } from "../../hooks/use-latest";

export function resolvedCanvasBackground(element: HTMLElement): string {
  const color = window.getComputedStyle(element).backgroundColor;
  if (color && color !== "rgba(0, 0, 0, 0)" && color !== "transparent") {
    return color;
  }

  const rootColor = window.getComputedStyle(document.documentElement).backgroundColor;
  if (rootColor && rootColor !== "rgba(0, 0, 0, 0)" && rootColor !== "transparent") {
    return rootColor;
  }

  return document.documentElement.classList.contains("dark") ? "#09090b" : "#ffffff";
}

export function useCanvasThemeRerender(rerender: () => void) {
  const rerenderLatest = useLatest(rerender);
  useEffect(() => {
    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(() => rerenderLatest.current());
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });
    return () => observer.disconnect();
  }, [rerenderLatest]);
}
