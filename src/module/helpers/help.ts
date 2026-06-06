import changelogRaw from "../../../CHANGELOG.md?raw";
import { LANCER } from "../config";

export interface ChangelogSection {
  title: string;
  items: string[];
}

export interface ChangelogRelease {
  version: string;
  date: string;
  sections: ChangelogSection[];
}

const HELP_WIKI = {
  faq: "https://github.com/VacantFanatic/foundryvtt-lancer/wiki/FAQ",
  resources: "https://github.com/VacantFanatic/foundryvtt-lancer/wiki/Recommended-Modules",
  changelog: "https://github.com/VacantFanatic/foundryvtt-lancer/blob/master/CHANGELOG.md",
} as const;

export type HelpTopic = "cloud-import" | "automation" | "accdiff";

function formatChangelogItem(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/`([^`]+)`/g, "<code>$1</code>");
}

export function parseChangelogRecent(raw: string, maxReleases = 3): ChangelogRelease[] {
  const releases: ChangelogRelease[] = [];
  const lines = raw.split("\n");
  let i = 0;

  while (i < lines.length && releases.length < maxReleases) {
    const header = lines[i].match(/^# (\d+\.\d+\.\d+) \(([^)]+)\)/);
    if (!header) {
      i++;
      continue;
    }

    const release: ChangelogRelease = { version: header[1], date: header[2], sections: [] };
    i++;

    let currentSection: ChangelogSection | null = null;
    while (i < lines.length && !lines[i].match(/^# \d+\.\d+\.\d+/)) {
      const sectionMatch = lines[i].match(/^## (.+)/);
      if (sectionMatch) {
        currentSection = { title: sectionMatch[1], items: [] };
        release.sections.push(currentSection);
      } else if (lines[i].startsWith("- ") && currentSection) {
        currentSection.items.push(formatChangelogItem(lines[i].slice(2)));
      }
      i++;
    }

    releases.push(release);
  }

  return releases;
}

export function getRecentChangelog(maxReleases = 3): ChangelogRelease[] {
  return parseChangelogRecent(changelogRaw, maxReleases);
}

export async function showLancerHelp(options?: { topic?: HelpTopic }): Promise<void> {
  const helpContent = await foundry.applications.handlebars.renderTemplate(
    `systems/${game.system.id}/templates/window/lancerHelp.hbs`,
    {
      releases: getRecentChangelog(3),
      wiki: HELP_WIKI,
      focusTopic: options?.topic ?? null,
    }
  );

  const dlg = new foundry.applications.api.DialogV2({
    window: {
      title: game.i18n.localize("lancer.help.dialog-title"),
      icon: "fas fa-robot",
    },
    content: helpContent,
    position: { width: 640 },
    buttons: [{ action: "close", label: game.i18n.localize("Close") }],
  });

  await dlg.render(true);

  if (options?.topic) {
    requestAnimationFrame(() => {
      dlg.element?.querySelector(`#help-topic-${options.topic}`)?.scrollIntoView({ block: "start" });
    });
  }
}

export async function startSystemTour(tourKey: string): Promise<void> {
  const tour = game.tours.get(`${game.system.id}.${tourKey}`);
  if (tour) await tour.start();
  else ui.notifications!.warn(game.i18n.format("lancer.help.tour-missing", { tour: tourKey }));
}

export function hasSeenAccdiffHelp(): boolean {
  return !!game.settings.get(game.system.id, LANCER.setting_help_seen_accdiff);
}

export async function markAccdiffHelpSeen(): Promise<void> {
  await game.settings.set(game.system.id, LANCER.setting_help_seen_accdiff, true);
}

export function helpWikiUrl(topic: HelpTopic): string {
  switch (topic) {
    case "cloud-import":
      return HELP_WIKI.faq;
    case "automation":
      return HELP_WIKI.faq;
    case "accdiff":
      return HELP_WIKI.faq;
  }
}

export interface ContextualHelpOptions {
  topic: HelpTopic;
  messageKey: string;
  showHelpButton?: boolean;
  wikiUrl?: string;
  tourKey?: string;
  dismissible?: boolean;
  dismissSetting?: string;
}

export async function renderContextualHelp(options: ContextualHelpOptions): Promise<string> {
  return foundry.applications.handlebars.renderTemplate(
    `systems/${game.system.id}/templates/window/contextual-help.hbs`,
    {
      topic: options.topic,
      message: game.i18n.localize(options.messageKey),
      showHelpButton: options.showHelpButton ?? true,
      wikiUrl: options.wikiUrl ?? helpWikiUrl(options.topic),
      tourKey: options.tourKey ?? null,
      dismissible: options.dismissible ?? false,
      dismissKey: options.dismissSetting ?? null,
    }
  );
}

export function bindContextualHelpActions(html: JQuery): void {
  html
    .find('[data-action="openLancerHelp"]')
    .off("click.lancerHelp")
    .on("click.lancerHelp", async ev => {
      ev.preventDefault();
      ev.stopPropagation();
      const topic = (ev.currentTarget as HTMLElement).dataset.helpTopic as HelpTopic | undefined;
      await showLancerHelp(topic ? { topic } : undefined);
    });

  html
    .find('[data-action="startSystemTour"]')
    .off("click.lancerTour")
    .on("click.lancerTour", async ev => {
      ev.preventDefault();
      ev.stopPropagation();
      const tourKey = (ev.currentTarget as HTMLElement).dataset.tourKey;
      if (tourKey) await startSystemTour(tourKey);
    });

  html
    .find('[data-action="dismissContextualHelp"]')
    .off("click.lancerHelpDismiss")
    .on("click.lancerHelpDismiss", async ev => {
      ev.preventDefault();
      ev.stopPropagation();
      const key = (ev.currentTarget as HTMLElement).dataset.helpDismiss;
      if (key) await game.settings.set(game.system.id, key, true);
      (ev.currentTarget as HTMLElement).closest(".lancer-contextual-help")?.remove();
    });
}
