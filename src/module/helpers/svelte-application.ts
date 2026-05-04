import type SvelteComponent from "*.svelte";

type SvelteAppOptions = foundry.applications.api.ApplicationV2.Configuration & {
  window?: foundry.applications.api.ApplicationV2.Configuration["window"];
  position?: foundry.applications.api.ApplicationV2.Configuration["position"];
  intro?: boolean;
};

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export default class SvelteApp<DataModel> extends HandlebarsApplicationMixin(ApplicationV2) {
  static PARTS = {
    body: { template: "systems/lancer/templates/window/svelte-host.hbs" },
  };

  static DEFAULT_OPTIONS = {
    classes: ["lancer", "svelte-app-host"],
  };

  klass: typeof SvelteComponent;
  data: DataModel;
  component?: SvelteComponent;
  declare options: SvelteAppOptions & { intro?: boolean };

  #resolve: ((data: DataModel) => void) | null = null;
  #reject: ((v: void) => void) | null = null;
  promise!: Promise<DataModel>; // constructor calls refreshPromise(), which definitely assigns this

  constructor(App: typeof SvelteComponent, data: DataModel, options?: SvelteAppOptions) {
    super(options);
    this.refreshPromise();
    this.data = data;
    this.klass = App;
  }

  refreshPromise() {
    if (this.#reject) {
      this.#reject();
    }
    this.promise = new Promise((resolve, reject) => {
      this.#resolve = resolve;
      this.#reject = reject;
    });
  }

  resolvePromise() {
    if (this.#resolve) {
      this.#resolve(this.data);
      this.#reject = null;
    }
  }

  rejectPromise() {
    if (this.#reject) {
      this.#reject();
      this.#resolve = null;
    }
  }

  _onRender(_context: object, options: Record<string, unknown>) {
    super._onRender(_context, options);
    const html = this.element.querySelector<HTMLElement>("[data-svelte-root]");
    if (!html) return;
    this.component?.$destroy();
    let component = new this.klass({
      target: html,
      props: this.data as Record<string, unknown>,
      intro: !!this.options.intro,
    });
    component.$on("submit", (_e: Event) => {
      this.resolvePromise();
      return this.close();
    });
    component.$on("cancel", (_e: Event) => {
      return this.close();
    });
    this.component = component;
  }

  async close(options?: foundry.applications.api.ApplicationV2.CloseOptions) {
    this.rejectPromise();
    this.component?.$destroy();
    this.component = undefined;
    return super.close(options);
  }
}
