<svelte:options accessors={true} />

<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { LancerActor } from "../../actor/lancer-actor";
  import { hudL, hudT } from "../../helpers/hud-i18n";
  import { hudModal } from "../slidinghud/hud-modal";

  export let title: string;
  export let stat: "structure" | "stress";
  export let lancerActor: LancerActor | null;

  let rollerName = lancerActor ? ` -- ${lancerActor.token?.name || lancerActor.name}` : "";

  const dispatch = createEventDispatcher();

  function focus(el: HTMLElement) {
    el.focus();
  }

  function escToCancel(_el: HTMLElement) {
    function escHandler(ev: KeyboardEvent) {
      if (ev.key === "Escape") {
        ev.preventDefault();
        dispatch("cancel");
      }
    }

    window.addEventListener("keydown", escHandler);
    return {
      destroy() {
        window.removeEventListener("keydown", escHandler);
      },
    };
  }

  function getCurrent(a: LancerActor | null) {
    if (!a || (!a.is_mech() && !a.is_npc())) return 0;
    return Math.max(a.system[stat].value - 1, 0);
  }

  function getDamage(a: LancerActor | null) {
    if (!a || (!a.is_mech() && !a.is_npc())) return 0;
    if (a.system[stat].value <= 0) return 0;
    return a.system[stat].max - getCurrent(a);
  }

  $: icon = stat === "stress" ? ("reactor" as const) : stat;
  $: current = getCurrent(lancerActor);
  $: damage = getDamage(lancerActor);
  $: canRoll = damage > 0;
  $: statLabel = hudL(`structstress.${stat}`);
</script>

<form
  id="structstress"
  class="lancer-hud structstress window-content"
  use:hudModal
  use:escToCancel
  on:submit|preventDefault={() => {
    if (!canRoll) return;
    dispatch("submit");
  }}
>
  <div class="lancer-header lancer-primary medium">
    <i class="cci cci-{icon} i--4 i--light" />
    <span>{title}{rollerName}</span>
  </div>
  {#if lancerActor && (lancerActor.is_mech() || lancerActor.is_npc())}
    <div class="lancer-hud-body">
      <h4>
        {
          hudT("structstress.damage-taken", { name: lancerActor?.name ?? hudL("common.unknown-actor"), stat: statLabel })
        }
      </h4>
      <div class="damage-preview">
        {#each { length: current } as _}
          <i class="cci cci-{icon} i--4 damage-pip" />
        {/each}
        {#each { length: damage } as _}
          <i class="mdi mdi-hexagon-outline i--4 damage-pip damaged" />
        {/each}
      </div>
      <p class="message">
        {#if canRoll}
          {hudT("structstress.roll-prompt", { dice: damage })}
        {:else}
          {hudT("structstress.no-roll", { stat: statLabel })}
        {/if}
      </p>
    </div>
  {/if}
  <div class="lancer-hud-buttons flexrow">
    <button class="dialog-button submit default" data-button="submit" type="submit" use:focus disabled={!canRoll}>
      <i class="fas fa-check" />
      {hudL("common.roll")}
    </button>
    <button class="dialog-button cancel" data-button="cancel" type="button" on:click={() => dispatch("cancel")}>
      <i class="fas fa-times" />
      {hudL("common.cancel")}
    </button>
  </div>
</form>

<style>
  @layer lancer {
    @layer applications {
      .lancer-hud-body h4 {
        margin-bottom: 0;
        font-size: 1rem;
      }

      .damage-preview {
        text-align: center;
      }

      .damaged {
        opacity: 30%;
      }
    }
  }
</style>
