<script lang="ts">
  import { hudL } from "../../helpers/hud-i18n";

  export let value: number = 0;
  export let id: string;
</script>

<button
  class="lancer-button dec-set"
  type="button"
  data-tooltip={hudL("accdiff.add-global-accuracy")}
  aria-label={hudL("accdiff.add-global-accuracy")}
  on:click={() => (value = value + 1)}
>
  <i class="cci cci-accuracy i--3" />
</button>
<label for={id} class="flexcol" data-tooltip={hudL("accdiff.global-accuracy-difficulty")}>
  <strong style="text-wrap: nowrap">Manual Adjust</strong>
  <strong class="accdiff-value">
    <span>{Math.abs(value)}</span>
    <i class="i--3 cci" class:cci-accuracy={value >= 0} class:cci-difficulty={value < 0} />
  </strong>
</label>
<input {id} class="difficulty lancer-invisible-input dec-set" style="display: none" type="number" bind:value />
<button
  class="lancer-button dec-set"
  type="button"
  data-tooltip={hudL("accdiff.add-global-difficulty")}
  aria-label={hudL("accdiff.add-global-difficulty")}
  on:click={() => (value = value - 1)}
>
  <i class="cci cci-difficulty i--3" />
</button>

<style lang="scss">
  @layer lancer {
    @layer components {
      .lancer-button {
        width: 5em;
        align-self: center;
      }

      label {
        text-align: center;
        margin: 0 0.5em;
        height: 3em;
      }

      .accdiff-value {
        height: 2em;
        vertical-align: middle;
      }
    }
  }
</style>
