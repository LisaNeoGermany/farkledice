import { FarkleApplication } from "./FarkleApplication.js";
import { moduleName } from "./utils.js";

export default class FarkleResetStats extends FarkleApplication {
  static DEFAULT_OPTIONS = {
    id: "farkle-reset-stats",
    classes: ["farkle-reset-stats"],
    window: {
      title: "Farkle",
      contentClasses: ["standard-form"]
    },
    actions: {
      confirm: FarkleResetStats.prototype._confirmReset,
      cancel: FarkleResetStats.prototype._cancel
    }
  };

  static PARTS = {
    body: {
      root: true,
      template: "modules/farkledice/templates/reset-stats.hbs"
    }
  };

  get title() {
    return game.i18n.localize("FARKLE.resetStatsConfirmationTitle");
  }

  async _prepareContext() {
    return {
      message: game.i18n.localize("FARKLE.resetStatsConfirmationMessage"),
      confirmLabel: game.i18n.localize("FARKLE.resetStatsConfirm"),
      cancelLabel: game.i18n.localize("FARKLE.resetStatsCancel")
    };
  }

  async _confirmReset() {
    for (const user of game.users) {
      await user.unsetFlag(moduleName, "stats");
    }
    ui.notifications.info(game.i18n.localize("FARKLE.resetStatsSuccess"));
    this.close();
  }

  _cancel() {
    this.close();
  }
}
