import type { ComponentProps, SvelteComponent } from "svelte";

let PilotCloudWizardComponent: typeof SvelteComponent | null = null;

export type PilotCloudWizardProps = ComponentProps<import("./PilotCloudWizard.svelte").default>;

export async function mountPilotCloudWizard(
  target: HTMLElement,
  props: PilotCloudWizardProps,
  events?: Record<string, (e: CustomEvent) => void>
) {
  const { mount } = await import("svelte");
  if (!PilotCloudWizardComponent) {
    PilotCloudWizardComponent = (await import("./PilotCloudWizard.svelte")).default;
  }
  return mount(PilotCloudWizardComponent, { target, props, events });
}
