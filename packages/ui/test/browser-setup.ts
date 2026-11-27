// happy-dom lacks parts of the browser Popover & Web Animations APIs that @effect/ui
// and @effect/ui-kit rely on; animation/layout behavior is checked in real Chromium.
if (typeof Element !== "undefined" && !Element.prototype.getAnimations) {
  Object.defineProperty(Element.prototype, "getAnimations", {
    configurable: true,
    writable: true,
    value: () => [],
  });
}

if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
  Object.defineProperty(Element.prototype, "scrollIntoView", {
    configurable: true,
    writable: true,
    value: () => {},
  });
}

if (typeof HTMLElement !== "undefined") {
  const openPopovers = new WeakSet<Element>();
  const origMatches = Element.prototype.matches;

  if (!HTMLElement.prototype.showPopover) {
    Object.defineProperty(HTMLElement.prototype, "showPopover", {
      configurable: true,
      writable: true,
      value(this: HTMLElement) {
        openPopovers.add(this);
      },
    });
  }

  if (!HTMLElement.prototype.hidePopover) {
    Object.defineProperty(HTMLElement.prototype, "hidePopover", {
      configurable: true,
      writable: true,
      value(this: HTMLElement) {
        openPopovers.delete(this);
      },
    });
  }

  if (!HTMLElement.prototype.togglePopover) {
    Object.defineProperty(HTMLElement.prototype, "togglePopover", {
      configurable: true,
      writable: true,
      value(this: HTMLElement, force?: boolean) {
        const next = force ?? !openPopovers.has(this);
        if (next) openPopovers.add(this);
        else openPopovers.delete(this);
        return next;
      },
    });
  }

  Element.prototype.matches = function matches(selector: string) {
    if (selector === ":popover-open") {
      return openPopovers.has(this);
    }
    return origMatches.call(this, selector);
  };
}
