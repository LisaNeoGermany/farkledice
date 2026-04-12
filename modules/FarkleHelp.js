import { FarkleApplication } from "./FarkleApplication.js";

export default class FarkleHelp extends FarkleApplication {
    static DEFAULT_OPTIONS = {
        id: "farkle-help-{id}",
        classes: ["farkle-scorer", "farkle-help"],
        window: {
            title: "Farkle",
            contentClasses: ["standard-form"],
            resizable: true
        },
        position: {
            width: 500,
            height: 700
        }
    };

    static PARTS = {
        body: {
            root: true,
            template: "modules/farkledice/templates/description.hbs"
        }
    };

    get title() {
        return game.i18n.localize("FARKLE.help");
    }
}
