/** Shared async-loading UI helpers for sheets and ref slots. */

export function asyncLoadingHtml(label?: string): string {
  const text = label ?? game.i18n.localize("lancer.async-ui.loading");
  return `<span class="lancer-async-loading" aria-busy="true">
    <i class="fas fa-spinner fa-spin" aria-hidden="true"></i>
    <span class="minor">${text}</span>
  </span>`;
}

export function bindAsyncRefreshButton(
  html: JQuery,
  selector: string,
  onRefresh: () => Promise<void>,
  options?: { loadingLabel?: string }
): void {
  html
    .find(selector)
    .off("click.lancerAsyncRefresh")
    .on("click.lancerAsyncRefresh", async ev => {
      ev.preventDefault();
      ev.stopPropagation();
      const btn = ev.currentTarget as HTMLElement;
      const prior = btn.innerHTML;
      btn.setAttribute("aria-busy", "true");
      btn.innerHTML = `<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> ${options?.loadingLabel ?? game.i18n.localize("lancer.async-ui.loading")}`;
      btn.classList.add("disabled");
      try {
        await onRefresh();
      } finally {
        btn.innerHTML = prior;
        btn.removeAttribute("aria-busy");
        btn.classList.remove("disabled");
      }
    });
}
