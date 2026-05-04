import { LancerActor } from "../actor/lancer-actor";
import { drilldownDocument, resolveDotpath } from "../helpers/commons";
import { LancerItem } from "../item/lancer-item";
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * A helper FormApplication subclass for editing a particular
 * @extends {FormApplication}
 */
export class TargetedEditForm<T> extends HandlebarsApplicationMixin(ApplicationV2) {
  // The T we're editing
  readonly value: T;

  // Where it is
  readonly value_path: string;

  // The item we're editing it on
  readonly target: LancerItem | LancerActor;

  // Promise to signal completion of workflow
  readonly resolve: () => void;

  constructor(
    target: LancerItem | LancerActor,
    value_path: string,
    options: Record<string, unknown> = {},
    resolve_func: () => void
  ) {
    super(foundry.utils.mergeObject(options, { document: target }, { inplace: false }));
    this.target = target;
    this.value_path = value_path;
    this.value = resolveDotpath(target, value_path) as T;
    this.resolve = resolve_func;
  }

  /**
   * @override
   * Activate event listeners using the prepared sheet HTML
   * @param html {HTMLElement}   The prepared HTML object ready to be rendered into the DOM
   */
  static PARTS = {
    form: { template: "" },
  };

  static DEFAULT_OPTIONS = {
    tag: "form",
    position: { width: 400, height: "auto" },
    classes: ["lancer", "targeted-form-editor"],
    form: {
      handler: this.#onSubmitForm,
      closeOnSubmit: true,
      submitOnChange: false,
    },
  };

  // Enables summoning of this form
  static handle(html: JQuery, selector: string, root_doc: LancerItem | LancerActor): void {
    html.find(selector).on("click", async evt => {
      evt.stopPropagation();
      const elt = evt.currentTarget as HTMLElement;
      const path = elt.dataset.path;
      if (path) {
        let dd = drilldownDocument(root_doc, path);
        return this.edit(dd.sub_doc, dd.sub_path);
      }
    });
  }

  /* -------------------------------------------- */

  // Override this to set child
  // Override this to add any auxillary data
  async _prepareContext(options: Record<string, unknown>) {
    const context = await super._prepareContext(options);
    return foundry.utils.mergeObject(context, {
      value: this.value,
      path: this.value_path,
    });
  }

  // Override this - this should return the object that should be updated at path
  fixupForm(form_data: Record<string, string | number | boolean>): Record<string, string | number | boolean> {
    return form_data;
  }

  /** @override */
  protected async updateTarget(
    event: SubmitEvent,
    form_data: Record<string, string | number | boolean>
  ): Promise<unknown> {
    // If cancel button, then do not save
    const submitter = event.submitter as HTMLElement | null;
    if (submitter?.dataset.button == "cancel") return;

    // Do basic fixup
    form_data = this.fixupForm(form_data);

    // Prepend every value with value_path
    let new_result = {} as Record<string, string | number | boolean>;
    for (let [k, v] of Object.entries(form_data)) {
      new_result[`${this.value_path}.${k}`] = v;
    }

    // Submit changes
    return this.target.update(new_result);
  }

  static async #onSubmitForm(
    this: TargetedEditForm<unknown>,
    event: SubmitEvent,
    _form: HTMLFormElement,
    formData: any
  ) {
    await this.updateTarget(event, formData.object);
    this.resolve();
  }

  /* -------------------------------------------- */

  /**
   * A helper constructor function which displays the bonus editor and returns a Promise once it's
   * workflow has been resolved.
   * @param doc Document to edit
   * @param path Where on the document the tag lies
   * @returns
   */
  static async edit(doc: LancerItem | LancerActor, path: string): Promise<void> {
    return new Promise((resolve, _reject) => {
      const app = new this(doc, path, {}, resolve);
      app.render(true);
    });
  }
}
