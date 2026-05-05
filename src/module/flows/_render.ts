// Import TypeScript modules
import { nanoid } from "nanoid";
import type { LancerActor } from "../actor/lancer-actor";

/**
 *
 */
// TODO: Indexed types for templates
export async function renderTemplateStep(actor: LancerActor, template: string, templateData: any, flags?: any) {
  templateData._uuid = nanoid();

  const html = await foundry.applications.handlebars.renderTemplate(template, templateData);

  // Schlorp up all the rolls into a mega-roll so DSN sees the stuff to throw
  // on screen
  const aggregate: Roll[] = [];
  if (templateData.roll) {
    aggregate.push(templateData.roll);
  }
  if (templateData.result) {
    aggregate.push(templateData.result.roll);
  }
  if ((templateData.attack_results?.length ?? 0) > 0) {
    aggregate.push(...templateData.attack_results.map((a: { roll: Roll }) => a.roll));
  }
  if ((templateData.crit_damage_results?.length ?? 0) > 0) {
    aggregate.push(...templateData.crit_damage_results.map((d: { roll: Roll }) => d.roll));
  } else if ((templateData.damage_results?.length ?? 0) > 0) {
    aggregate.push(...templateData.damage_results.map((d: { roll: Roll }) => d.roll));
  }
  if (templateData.self_heat_result) {
    aggregate.push(templateData.self_heat_result.roll);
  }
  return createChatMessageStep(actor, html, aggregate, flags);
}

export async function createChatMessageStep(
  actor: LancerActor,
  html: HTMLElement | string,
  rolls?: Roll | Roll[],
  flags?: any
) {
  if (rolls && !Array.isArray(rolls)) rolls = [rolls];
  let chat_data = {
    style: CONST.CHAT_MESSAGE_STYLES.IC,
    rolls,
    speaker: {
      actor: actor,
      token: actor?.token,
      alias: !!actor?.token ? actor.token.name : null,
    },
    content: html,
    flags: flags ? { lancer: flags } : undefined,
  };

  // Respect chat visibility across Foundry versions.
  const mode = (game.settings.get("core", "messageMode") ?? game.settings.get("core", "rollMode")) as number | string;
  const chatMessageClass = ChatMessage as typeof ChatMessage & {
    applyMode?: (data: Record<string, unknown>, mode: number | string) => void;
    applyMessageMode?: (data: Record<string, unknown>, mode: number | string) => void;
    applyRollMode?: (data: Record<string, unknown>, mode: number | string) => void;
  };
  if (typeof chatMessageClass.applyMode === "function") {
    chatMessageClass.applyMode(chat_data, mode);
  } else if (typeof chatMessageClass.applyMessageMode === "function") {
    chatMessageClass.applyMessageMode(chat_data, mode);
  } else if (typeof chatMessageClass.applyRollMode === "function") {
    chatMessageClass.applyRollMode(chat_data, mode);
  }

  if (!rolls) delete chat_data.rolls;
  const cm = await ChatMessage.implementation.create(chat_data);
  cm?.render();
}
