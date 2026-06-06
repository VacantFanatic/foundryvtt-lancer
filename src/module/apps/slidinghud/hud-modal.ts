const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusableElements(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(el => el.offsetParent !== null);
}

/** aria-modal dialog behavior: initial focus + Tab focus trap (Escape handled separately). */
export function hudModal(node: HTMLElement) {
  node.setAttribute("aria-modal", "true");
  node.setAttribute("role", "dialog");

  const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;

  const focusFirst = () => {
    const items = focusableElements(node);
    (items[0] ?? node).focus();
  };

  focusFirst();

  const onKeydown = (ev: KeyboardEvent) => {
    if (ev.key !== "Tab") return;
    const items = focusableElements(node);
    if (items.length < 2) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (ev.shiftKey && document.activeElement === first) {
      ev.preventDefault();
      last.focus();
    } else if (!ev.shiftKey && document.activeElement === last) {
      ev.preventDefault();
      first.focus();
    }
  };

  node.addEventListener("keydown", onKeydown);

  return {
    destroy() {
      node.removeEventListener("keydown", onKeydown);
      previouslyFocused?.focus?.();
    },
  };
}
