# Foundry V13/V14 App Migration Audit

This document tracks application and document sheet classes relative to Foundry’s Application Framework V2 (`ApplicationV2`, `HandlebarsApplicationMixin`, `ActorSheetV2`, `DocumentSheetV2` / `ItemSheetV2`) while supporting both Foundry V13 and V14.

## Already migrated (ApplicationV2)

### Core system sheets (this branch)

- `src/module/actor/lancer-actor-sheet.ts` and subclasses (`pilot-sheet`, `mech-sheet`, `npc-sheet`, `deployable-sheet`) — `HandlebarsApplicationMixin(ActorSheetV2)`
- `src/module/item/item-sheet.ts` and subclasses (`frame-sheet`, `license-sheet`, `npc-class-sheet`, `npc-feature-sheet`) — `HandlebarsApplicationMixin(ItemSheetV2)` with `DocumentSheetV2` fallback

### Other apps

- `src/module/apps/lancer-initiative-config-form.ts`
- `src/module/apps/lcp-manager/lcp-manager.ts`
- `src/module/apps/action-tracker-settings.ts`
- `src/module/apps/automation-settings.ts`
- `src/module/apps/status-icon-config.ts`
- `src/module/helpers/compcon-login-form.ts`
- `src/module/apps/text-editor.ts` (`HTMLEditDialog`)
- `src/module/apps/targeted-form-editor.ts`
- `src/module/action/action-manager.ts`
- `src/module/helpers/svelte-application.ts`
- `src/module/combat/lancer-combat-tracker.ts` (extends core `CombatTracker` with `PARTS` / `DEFAULT_OPTIONS`)

No immediate migration action is required for these files unless Foundry changes the V2 API again.

## AppV2 migration guardrails

- Runtime warnings for any class still extending V1 app bases are emitted through `warnIfUsingV1App` in `src/module/helpers/appv2-migration.ts`.
- Use `static DEFAULT_OPTIONS` and `static PARTS`; do not keep V1 `defaultOptions` getters.
- For forms, use `tag: "form"` and `DEFAULT_OPTIONS.form.handler` (`formData.object` payload) instead of `_updateObject`.
- Move template data prep from `getData` to `_prepareContext`.
- Prefer `data-action` / delegated listeners where controls must survive partial rerenders; otherwise keep `activateListeners` but always call `super.activateListeners` first and gate edit-only code with `this.isEditable` (not `this.options.editable`).
- Do not mutate `this.options` after `super(...)`; store runtime state on instance fields.
- Tab strips: `static TABS`, nav with class `tabs`, `data-action="tab"`, `data-group`, `data-tab`, and `{{tabs.<group>.<id>.cssClass}}` on nav and content panels.
- Outer sheet templates must not nest `<form>` when the application root is `tag: "form"` — use `<section>` (or `<div>`) as the inner wrapper.

## Remaining / watch list

- Third-party or macro code that still assumes V1 `ActorSheet` / `ItemSheet` constructor shapes should be rare; core registration now targets `ActorSheetV2` / `ItemSheetV2` with optional cleanup of legacy V1 registrations when present.
