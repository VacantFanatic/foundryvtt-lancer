import { LancerActor } from "../actor/lancer-actor";
import { resolveDotpath } from "../helpers/commons";
import { LancerItem } from "../item/lancer-item";
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export async function richTextEdit(doc: foundry.abstract.Document.Any, property: string): Promise<string | undefined> {
  const originalText = foundry.utils.getProperty(doc, property);
  if (typeof originalText !== "string") throw new Error(`Document property ${property} is not a string`);
  const content = document.createElement("div");
  content.appendChild(
    // @ts-expect-error The missing stuff is definitely optional
    foundry.applications.elements.HTMLProseMirrorElement.create({
      name: "result",
      toggled: false,
      value: originalText,
    })
  );
  const { result }: { result?: string } =
    ((await foundry.applications.api.Dialog.input(<foundry.applications.api.Dialog.InputConfig>{
      id: `richEditor-${doc.uuid}-${property}`,
      content,
      classes: ["lancer", "rich-editor"],
      window: { resizable: true },
      position: { width: 550, height: 400 },
    })) as any) ?? {};
  return result;
}

/**
 * A helper Dialog subclass for editing html descriptions, which will automatically fixup html written to it (so the user doesn't just nuke themselves)
 * @extends {Dialog}
 */
export class HTMLEditDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  readonly target: LancerActor | LancerItem;
  readonly textPath: string;
  readonly resolve: () => void;

  static PARTS = {
    form: { template: "systems/lancer/templates/window/html_editor.hbs" },
  };

  static DEFAULT_OPTIONS = {
    id: "lancer-html-editor",
    tag: "form",
    position: { width: 650 },
    window: { resizable: true },
    classes: ["lancer", "lancer-text-editor"],
    form: {
      handler: this.#onSubmitForm,
      closeOnSubmit: true,
      submitOnChange: false,
    },
  };

  constructor(options: {
    document: LancerActor | LancerItem;
    textPath: string;
    resolve: () => void;
    window?: { title?: string };
  }) {
    super(options);
    this.target = options.document;
    this.textPath = options.textPath;
    this.resolve = options.resolve;
  }

  async _prepareContext(options: Record<string, unknown>) {
    const context = await super._prepareContext(options);
    return foundry.utils.mergeObject(context, {
      text: resolveDotpath(this.target, this.textPath),
    });
  }

  protected override _onRender(context: object, options: Record<string, unknown>): void {
    super._onRender(context, options);
    this._mountProseMirrorEditor();
  }

  /** App V2 cannot use the legacy {{editor}} helper; mount prose-mirror programmatically. */
  _mountProseMirrorEditor(): void {
    const root = this.element;
    if (!(root instanceof HTMLElement)) return;

    const mount = root.querySelector<HTMLElement>("[data-prose-mirror-mount]");
    if (!mount || mount.querySelector("prose-mirror")) return;

    const text = resolveDotpath(this.target, this.textPath);
    mount.appendChild(
      // @ts-expect-error The missing stuff is definitely optional
      foundry.applications.elements.HTMLProseMirrorElement.create({
        name: "text",
        toggled: false,
        value: typeof text === "string" ? text : "",
      })
    );
  }

  static async #onSubmitForm(this: HTMLEditDialog, _event: SubmitEvent, _form: HTMLFormElement, formData: any) {
    let newText = formData.object.text;

    // We trust tox to have handles html correction
    // let doc = document.createElement('div');
    // doc.innerHTML = new_text;
    // new_text = doc.innerHTML; // Will have had all tags etc closed

    // Do the merge
    await this.target.update({ [this.textPath]: newText });
    this.resolve();
  }

  async close(options?: foundry.applications.api.ApplicationV2.CloseOptions): Promise<this> {
    this.resolve();
    return super.close(options);
  }

  /* -------------------------------------------- */

  /**
   * A helper constructor function which displays the text edit dialog and returns a Promise once it's
   * workflow has been resolved.
   * @return {Promise}
   */
  static async edit_text(in_object: LancerActor | LancerItem, at_path: string): Promise<void> {
    return new Promise((resolve, _reject) => {
      const dlg = new this({ document: in_object, textPath: at_path, resolve, window: { title: "Edit Text" } });
      dlg.render(true);
    });
  }
}
