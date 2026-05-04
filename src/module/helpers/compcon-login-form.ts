import { populatePilotCache } from "../util/compcon";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export default class CompconLoginForm extends HandlebarsApplicationMixin(ApplicationV2) {
  static PARTS = {
    form: { template: "systems/lancer/templates/window/compcon_login.hbs" },
  };

  static DEFAULT_OPTIONS = {
    id: "lancer-compcon-login",
    tag: "form",
    position: { width: 480 },
    window: {
      title: "COMP/CON Login",
      resizable: false,
    },
    classes: ["lancer"],
    form: {
      handler: this.#onSubmitForm,
      closeOnSubmit: false,
      submitOnChange: false,
    },
  };

  static async #onSubmitForm(this: CompconLoginForm, _event: SubmitEvent, _form: HTMLFormElement, formData: any) {
    const data = formData.object;
    try {
      //FIRST attempt to login with case sensitivity

      const { Auth } = await import("@aws-amplify/auth");

      let res = await Auth.signIn(data.username, data.password);
      ui.notifications!.info("Logged in as " + res.attributes.email);
      // we have a fresh login token, let's populate the pilot cache
      // no need to block on it, it can happen in the background
      populatePilotCache();
      return this.close();
    } catch (e) {
      try {
        //SECOND attempt to login with case insensitivity

        const { Auth } = await import("@aws-amplify/auth");

        //username will be converted to lowercase to make emails case insensitive
        let res = await Auth.signIn(data.username.toLocaleLowerCase(), data.password);
        ui.notifications!.info("Logged in as " + res.attributes.email);
        // we have a fresh login token, let's populate the pilot cache
        // no need to block on it, it can happen in the background
        populatePilotCache();
        return this.close();
      } catch (e) {
        // AWS-amplify doesn't throw Errors for no apparent reason so ignore types and try our best
        ui.notifications!.error(`Could not log in to Comp/Con: ${(e as any)?.message ?? e}`);
        console.error(e);
      }
    }
  }
}
