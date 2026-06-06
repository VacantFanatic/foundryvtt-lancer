// Import TypeScript modules
import { LANCER } from "../config";
import { StabOptions1, StabOptions2 } from "../enums";
import { printGenericCard } from "./text";
import { LancerActor } from "../actor/lancer-actor";
import { Flow, type FlowState, type Step } from "./flow";
import { LancerFlowState } from "./interfaces";
import type { UUIDRef } from "../source-template";

const lp = LANCER.log_prefix;

export function registerStabilizeSteps(flowSteps: Map<string, Step<any, any> | Flow<any>>) {
  flowSteps.set("initializeStabilize", initializeStabilize);
  flowSteps.set("renderStabilizePrompt", renderStabilizePrompt);
  flowSteps.set("applyStabilizeUpdates", applyStabilizeUpdates);
  flowSteps.set("printStabilizeResult", printStabilizeResult);
}

export class StabilizeFlow extends Flow<LancerFlowState.StabilizeData> {
  static steps = ["initializeStabilize", "renderStabilizePrompt", "applyStabilizeUpdates", "printStabilizeResult"];

  constructor(uuid: UUIDRef | LancerActor, data?: Partial<LancerFlowState.StabilizeData>) {
    const initialData: LancerFlowState.StabilizeData = {
      title: data?.title || "",
      description: "",
      option1: data?.option1 || StabOptions1.Cool,
      option2: data?.option2 || StabOptions2.Reload,
    };
    super(uuid, initialData);
  }
}

async function initializeStabilize(state: FlowState<LancerFlowState.StabilizeData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Stabilize flow state data missing!`);
  state.data.title = state.data.title || `${state.actor.name?.capitalize()} HAS STABILIZED`;
  return true;
}

async function renderStabilizePrompt(state: FlowState<LancerFlowState.StabilizeData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Stabilize flow state data missing!`);
  const actor = state.actor;
  let template = await renderTemplate(`systems/${game.system.id}/templates/window/promptStabilize.hbs`, {});

  let submit: boolean | null = null;

  const action = await foundry.applications.api.DialogV2.wait({
    window: {
      title: game.i18n.format("lancer.flow.stabilize.title", { name: actor.name ?? "" }),
      icon: "cci cci-repair",
    },
    content: template,
    buttons: [
      {
        action: "submit",
        icon: "fas fa-check",
        label: game.i18n.localize("lancer.flow.common.submit"),
        default: true,
        callback: (_event, _button, dialog) => {
          if (!state.data) return false;
          const root = dialog.element as HTMLElement;
          state.data.option1 = <StabOptions1>$(root).find(".stabilize-options-1:checked").first().val();
          state.data.option2 = <StabOptions2>$(root).find(".stabilize-options-2:checked").first().val();
          return true;
        },
      },
      {
        action: "cancel",
        icon: "fas fa-times",
        label: game.i18n.localize("lancer.flow.common.cancel"),
      },
    ],
  });
  return action === "submit";
}

async function applyStabilizeUpdates(state: FlowState<LancerFlowState.StabilizeData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Stabilize flow state data missing!`);
  let option1text = "";
  let option2text = "";
  state.data.description = "";
  switch (state.data.option1) {
    case StabOptions1.Cool:
      option1text = "Mech is cooling itself. Heat and @Compendium[world.status-items.Exposed] cleared.";
      break;
    case StabOptions1.Repair:
      if (state.actor.is_mech() && state.actor.system.repairs.value <= 0) {
        ui.notifications!.warn("Mech has no repairs left. Please try again.");
        return false;
      } else {
        option1text = "Mech has spent 1 repair to regain HP.";
      }
      break;
  }
  switch (state.data.option2) {
    case StabOptions2.ClearBurn:
      option2text = "Mech has cleared all burn.";
      break;
    case StabOptions2.ClearOwnCond:
      option2text = "Mech has selected to clear own condition. Please clear manually.";
      break;
    case StabOptions2.ClearOtherCond:
      option2text = "Mech has selected to clear an allied condition. Please clear manually.";
      break;
    case StabOptions2.Reload:
      option2text = "Mech has selected full reload. Weapons reloaded:<ul>";
      for (const change of state.actor.loadoutHelper.reloadableItems()) {
        if (change.name && change["system.loaded"] === true) {
          option2text = option2text.concat(`<li>${change.name}</li>`);
        }
      }
      option2text = option2text.concat("</ul>");
      break;
  }
  state.data.description = `<ul><li>${option1text}</li><li>${option2text}</li></ul>`;
  await state.actor.strussHelper.stabilize(state.data.option1, state.data.option2);
  return true;
}

async function printStabilizeResult(state: FlowState<LancerFlowState.StabilizeData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Stabilize flow state data missing!`);
  printGenericCard(state);
  return true;
}
