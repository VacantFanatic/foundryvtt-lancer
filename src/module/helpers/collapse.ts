import type { LancerActor } from "../actor/lancer-actor";
import type { LancerItem } from "../item/lancer-item";

export type CollapseRegistry = { [LID: string]: number };

export const COLLAPSE_KEY = "collapse_state";
/** To make collapsible work on a sheet, that sheet must export as part of its getData() function an instance of this object,
 * under the key [COLLAPSE_KEY]
 */
export class CollapseHandler {
  private state: Map<string, boolean> = new Map();

  // Toggle the specified collapsible, returning new state
  toggle(id: string): boolean {
    let curr = this.state.get(id) ?? false;
    this.state.set(id, !curr);
    return !curr;
  }

  // Get whether a state should be expanded
  get(id: string) {
    return this.state.get(id) ?? false;
  }
}

export function collapseID(
  collapse: CollapseRegistry,
  doc: string | LancerActor | LancerItem | null | undefined,
  no_inc: boolean
): string {
  let doc_id: string;
  if (doc instanceof foundry.abstract.Document) {
    doc_id = doc.id ?? "ephem";
  } else if (typeof doc == "string") {
    doc_id = doc;
  } else {
    doc_id = "uncat";
  }
  if (collapse[doc_id] == undefined) collapse[doc_id] = 0;
  let collapse_index: number;
  if (no_inc) {
    collapse_index = collapse[doc_id];
  } else {
    collapse_index = ++collapse[doc_id];
  }
  return `${doc_id}_${collapse_index}`;
}

export function collapseSectionForId(collapseId: string): Element | null {
  return document.querySelector(`.collapse[data-collapse-id="${collapseId}"]`);
}

export function syncCollapseAria(trigger: Element, section?: Element | null): void {
  const id = trigger.getAttribute("data-collapse-id");
  const collapse =
    section ??
    (id ? collapseSectionForId(id) : null) ??
    (id ? document.querySelector(`[data-collapse-id="${id}"].collapse`) : null);
  const expanded = collapse ? !collapse.classList.contains("collapsed") : true;
  trigger.setAttribute("aria-expanded", expanded ? "true" : "false");
}

function enhanceCollapseTrigger(trigger: Element): void {
  if (!trigger.hasAttribute("role") && trigger.tagName !== "BUTTON") {
    trigger.setAttribute("role", "button");
  }
  if (!trigger.hasAttribute("tabindex") && trigger.tagName !== "BUTTON") {
    trigger.setAttribute("tabindex", "0");
  }
  if (!trigger.hasAttribute("aria-label")) {
    trigger.setAttribute("aria-label", game.i18n.localize("lancer.collapse.toggle"));
  }
  syncCollapseAria(trigger);
}

export function enhanceCollapseTriggers(html: JQuery): void {
  html.find(".collapse-trigger").each((_, el) => enhanceCollapseTrigger(el));
}

export function collapseButton(
  collapse: CollapseRegistry | undefined | null,
  doc?: string | LancerActor | LancerItem | null,
  no_increment: boolean = false
) {
  if (collapse) {
    const id = collapseID(collapse, doc, no_increment);
    return `<button type="button" class="collapse-trigger collapse-icon" data-collapse-id="${id}" aria-expanded="true" aria-label="${game.i18n.localize("lancer.collapse.toggle")}">
      <i class="mdi mdi-unfold-less-horizontal" aria-hidden="true"></i>
    </button>`;
  }
  return "";
}

export function collapseParam(
  collapse: CollapseRegistry | undefined | null,
  doc?: string | LancerActor | LancerItem | null,
  no_increment: boolean = false
) {
  if (collapse) {
    return `data-collapse-id="${collapseID(collapse, doc, no_increment)}"`;
  }
  return "";
}

export function toggleCollapse(trigger: Element): void {
  const id = trigger.getAttribute("data-collapse-id");
  if (!id) return;

  const collapse = collapseSectionForId(id);
  const prefix = `lancer-collapse`;
  if (collapse?.classList.contains("collapsed")) {
    collapse.classList.remove("collapsed");
    sessionStorage.setItem(`${prefix}-${id}`, "opened");
  } else {
    collapse?.classList.add("collapsed");
    sessionStorage.setItem(`${prefix}-${id}`, "closed");
  }

  document.querySelectorAll(`.collapse-trigger[data-collapse-id="${id}"]`).forEach(t => syncCollapseAria(t, collapse));
}

const handleCollapse = (ev: Event) => {
  ev.preventDefault();
  ev.stopPropagation();
  toggleCollapse(ev.currentTarget as Element);
};

const handleCollapseKeydown = (ev: JQuery.KeyDownEvent) => {
  if (ev.key !== "Enter" && ev.key !== " ") return;
  ev.preventDefault();
  toggleCollapse(ev.currentTarget);
};

export function applyCollapseListeners(html: JQuery) {
  enhanceCollapseTriggers(html);
  html.find(".collapse-trigger").on("click", handleCollapse).on("keydown", handleCollapseKeydown);
}

export function initializeCollapses(html: JQuery) {
  let collapse_sections = html.find(".collapse");
  collapse_sections.each((_index, section) => {
    let id = section.getAttribute("data-collapse-id");
    if (id) {
      let ssv = sessionStorage.getItem("lancer-collapse-" + id);
      if (ssv == "opened") {
        section.classList.remove("collapsed");
      } else if (ssv == "closed") {
        section.classList.add("collapsed");
      }
    }
  });
  enhanceCollapseTriggers(html);
  html.find(".collapse-trigger").each((_, trigger) => syncCollapseAria(trigger));
}
