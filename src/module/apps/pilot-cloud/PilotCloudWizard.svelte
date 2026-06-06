<script lang="ts">
  import { createEventDispatcher } from "svelte";

  export let compConLoggedIn = false;
  export let compConPilotCount = 0;
  export let compConPilotList: Record<string, string> = {};
  export let cloudId = "";
  export let lastCloudUpdate = "";
  export let downloading = false;

  const dispatch = createEventDispatcher<{
    compconLogin: void;
    download: void;
    startTour: void;
    selectCloudId: { value: string };
    cloudIdInput: { value: string };
    jsonFile: { file: File };
  }>();

  $: pilotOptions = Object.entries(compConPilotList);
</script>

<ol class="cloud-wizard-steps" aria-label={game.i18n.localize("lancer.pilot-sheet.cloud-wizard.steps-label")}>
  <li class="cloud-wizard-step-label" data-cloud-step="login">
    <span class="cloud-wizard-step-num">1</span>
    <span class="minor">{game.i18n.localize("lancer.pilot-sheet.cloud-wizard.step-login")}</span>
  </li>
  <li class="cloud-wizard-step-label" data-cloud-step="select">
    <span class="cloud-wizard-step-num">2</span>
    <span class="minor">{game.i18n.localize("lancer.pilot-sheet.cloud-wizard.step-select")}</span>
  </li>
  <li class="cloud-wizard-step-label" data-cloud-step="import">
    <span class="cloud-wizard-step-num">3</span>
    <span class="minor">{game.i18n.localize("lancer.pilot-sheet.cloud-wizard.step-import")}</span>
  </li>
</ol>

<div class="cloud-wizard-panels">
  <div class="card clipped cloud-wizard-panel" data-cloud-step="login">
    <span class="lancer-header lancer-primary major">{
      game.i18n.localize("lancer.pilot-sheet.cloud-wizard.login-title")
    }</span>
    {#if compConLoggedIn}
      <p class="minor desc-text cloud-login-status cloud-login-status--ok">
        {game.i18n.format("lancer.pilot-sheet.cloud-wizard.logged-in", { count: compConPilotCount })}
      </p>
    {:else}
      <p class="minor desc-text cloud-login-status">
        {game.i18n.localize("lancer.pilot-sheet.cloud-wizard.logged-out")}
      </p>
    {/if}
    <button
      type="button"
      class="lancer-button cloud-login-button"
      data-action="compconLogin"
      on:click={() => dispatch("compconLogin")}
    >
      <i class="mdi mdi-cloud-sync-outline"></i>
      {game.i18n.localize("lancer.pilot-sheet.cloud-wizard.login-button")}
    </button>
  </div>

  <div class="card clipped cloud-wizard-panel" data-cloud-step="select">
    <span class="lancer-header lancer-primary major">{
      game.i18n.localize("lancer.pilot-sheet.cloud-header.label")
    }</span>
    <p class="minor desc-text">{game.i18n.localize("lancer.pilot-sheet.cloud-header.vaultID")}</p>
    <select
      class="lancer-input major lancer-text-field cloud-pilot-select"
      name="selectCloudId"
      on:change={e => dispatch("selectCloudId", { value: (e.currentTarget as HTMLSelectElement).value })}
    >
      <option value=""></option>
      {#each pilotOptions as [label, value]}
        <option {value} selected={value === cloudId}>{label}</option>
      {/each}
    </select>
    <input
      class="lancer-input major cloud-share-code"
      type="text"
      name="system.cloud_id"
      value={cloudId}
      placeholder={game.i18n.localize("lancer.pilot-sheet.cloud-header.raw-placeholder")}
      on:input={e => dispatch("cloudIdInput", { value: (e.currentTarget as HTMLInputElement).value })}
    />
  </div>

  <div class="cloud-wizard-import-row">
    <div class="card clipped cloud-wizard-panel" data-cloud-step="import">
      <span class="lancer-header lancer-primary major">{
        game.i18n.localize("lancer.pilot-sheet.cloud-download.label")
      }</span>
      <button
        type="button"
        class="cloud-control lancer-button cloud-download-button"
        class:disabled-cloud={downloading}
        class:cloud-downloading={downloading}
        data-action="download"
        aria-busy={downloading}
        disabled={downloading}
        on:click={() => dispatch("download")}
      >
        <i class="cci cci-tech-quick i--dark i--5 cloud-download-idle" hidden={downloading}></i>
        <i class="fas fa-spinner fa-spin cloud-download-spinner i--dark i--5" hidden={!downloading}></i>
      </button>
      <span class="minor desc-text cloud-download-status">
        {game.i18n.format("lancer.pilot-sheet.cloud-download.lastSync", { timestamp: lastCloudUpdate })}
      </span>
    </div>

    <div class="card clipped cloud-wizard-panel" data-cloud-step="import">
      <span class="lancer-header lancer-primary major">{
        game.i18n.localize("lancer.pilot-sheet.json-import.label")
      }</span>
      <p class="minor desc-text">{game.i18n.localize("lancer.pilot-sheet.cloud-wizard.json-hint")}</p>
      <input
        id="pilot-json-import"
        type="file"
        name="pilot-json-up"
        class="lcp-up"
        accept=".json"
        on:change={e => {
          const file = (e.currentTarget as HTMLInputElement).files?.[0];
          if (file) dispatch("jsonFile", { file });
        }}
      />
    </div>
  </div>
</div>

<div class="cloud-wizard-footer">
  <button
    type="button"
    class="lancer-button cloud-tour-link"
    data-action="startPilotImportTour"
    on:click={() => dispatch("startTour")}
  >
    <i class="fas fa-route"></i>
    {game.i18n.localize("lancer.pilot-sheet.cloud-wizard.tour-link")}
  </button>
</div>
