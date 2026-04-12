import { moduleName } from "./utils.js";
const { ApplicationV2 } = foundry.applications.api;

export default class FarkleStart extends ApplicationV2 {
    static DEFAULT_OPTIONS = {
        id: "farkle-start-trigger",
        window: {
            frame: false
        }
    };

    async render(options={}, _options={}) {
        game.modules.get(moduleName).api.farkle();
        return this;
    }
}
