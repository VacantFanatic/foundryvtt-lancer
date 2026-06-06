import type { ComponentProps, SvelteComponent } from "svelte";

let LoadoutEditorComponent: typeof SvelteComponent | null = null;

export type LoadoutEditorProps = ComponentProps<import("./LoadoutEditor.svelte").default>;

export async function mountLoadoutEditor(target: HTMLElement, props: LoadoutEditorProps) {
  const { mount } = await import("svelte");
  if (!LoadoutEditorComponent) {
    LoadoutEditorComponent = (await import("./LoadoutEditor.svelte")).default;
  }
  return mount(LoadoutEditorComponent, { target, props });
}
