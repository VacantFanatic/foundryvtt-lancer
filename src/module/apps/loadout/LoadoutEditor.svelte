<script lang="ts">
  export let mountCount = 0;
  export let systemCount = 0;
  export let spUsed = 0;
  export let spMax = 0;
  export let mountLabels: string[] = [];
</script>

<div class="loadout-editor lancer card clipped">
  <div class="lancer-header lancer-primary major">
    <span>{game.i18n.localize("lancer.loadout-editor.title")}</span>
    <span class="minor">{game.i18n.localize("lancer.loadout-editor.experimental")}</span>
  </div>
  <p class="minor desc-text">{game.i18n.localize("lancer.loadout-editor.hint")}</p>
  <div class="loadout-editor-summary flexrow">
    <div class="loadout-editor-stat">
      <strong>{mountCount}</strong>
      <span class="minor">{game.i18n.localize("lancer.loadout-editor.mounts")}</span>
    </div>
    <div class="loadout-editor-stat">
      <strong>{systemCount}</strong>
      <span class="minor">{game.i18n.localize("lancer.loadout-editor.systems")}</span>
    </div>
    <div class="loadout-editor-stat">
      <strong>{spUsed} / {spMax}</strong>
      <span class="minor">{game.i18n.localize("lancer.loadout-editor.sp")}</span>
    </div>
  </div>
  {#if mountLabels.length}
    <ul class="loadout-editor-mount-list">
      {#each mountLabels as label}
        <li class="minor">{label}</li>
      {/each}
    </ul>
  {/if}
  <p class="minor desc-text">{game.i18n.localize("lancer.loadout-editor.legacy-hint")}</p>
</div>

<style lang="scss">
  @layer lancer.applications {
    .loadout-editor-summary {
      gap: 1rem;
      margin: 0.5rem 0;
    }
    .loadout-editor-stat {
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 5rem;
    }
    .loadout-editor-mount-list {
      margin: 0.5rem 0 0 1rem;
      padding: 0;
    }
  }
</style>
