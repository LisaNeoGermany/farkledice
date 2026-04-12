import { FarkleApplication } from "./FarkleApplication.js";
import { moduleDebug, moduleName, resolveRootElement } from "./utils.js";
const { getProperty } = foundry.utils;

export default class PickLoadedDice extends FarkleApplication {
    static DEFAULT_OPTIONS = {
        id: "farkle-pick-loaded-{id}",
        classes: ["farkle-scorer"],
        window: {
            title: "Farkle",
            contentClasses: ["standard-form"]
        },
        position: {
            width: 500
        }
    };

    static PARTS = {
        body: {
            root: true,
            template: "modules/farkledice/templates/pickLoadedDice.hbs"
        }
    };

    get title() {
        return game.i18n.localize("FARKLE.pickLoadedDice");
    }

    constructor(actors, options = {}) {
        super(options);
        this.actors = actors;
    }

    async _prepareContext(options) {
        const context = {};
        context.actors = this.actors.map(actor => {
            return {
                name: actor.name,
                img: actor.img,
                uuid: actor.uuid,
                loaded: actor.items.filter(item => getProperty(item, 'flags.farkledice.loaded')).map(item => {
                    return {
                        uuid: item.uuid,
                        name: item.name,
                        img: item.img || "icons/svg/dice-target.svg",
                    }
                })
            }
        })
        return context;
    }

    _pickDie(event) {
        const maxPicks = 6;
        const target = event.currentTarget;
        const actorContainer = target.closest('[data-uuid]');
        const selected = actorContainer.querySelectorAll('.picked');
        if (selected.length >= maxPicks && !target.classList.contains('picked')) {
            return;
        }
        target.classList.toggle('picked');
    }

    async _confirmSelection() {
        const root = resolveRootElement(null, this.element);
        if (!root) {
            moduleDebug("PickLoadedDice confirm missing root");
            return;
        }
        const actors = root.querySelectorAll('[data-uuid]');

        const cheats = {}

        for (let actor of actors) {
            const selected = actor.querySelectorAll('.picked');
            if (selected.length === 0) continue;

            const uuid = actor.dataset.uuid;
            const items = await Promise.all(Array.from(selected).map(async (die) => {
                return await fromUuid(die.dataset.die);
            }));

            const loadedDice = items.map(item => {
                return item.flags.farkledice.loaded || [1, 1, 1, 1, 1, 1];
            });
            const loadedWithIndex = [];
            for (let i = 0; i < loadedDice.length; i++) {
                let randomIndex = Math.floor(Math.random() * 6);
                while (loadedWithIndex[randomIndex]) {
                    randomIndex = Math.floor(Math.random() * 6);
                }
                loadedWithIndex[randomIndex] = loadedDice[i];
            }

            cheats[uuid] = loadedWithIndex;
        }
        
        // Finde die richtige Spielinstanz und setze die cheats
        const games = game.modules.get(moduleName).games;
        if (games) {
            for (let gameId in games) {
                const gameInstance = games[gameId];
                // Prüfe ob der aktuelle User in diesem Spiel ist
                if (gameInstance && gameInstance.gameState && gameInstance.gameState.users) {
                    const isInGame = gameInstance.gameState.users.some(u => u.id === game.user.id);
                    if (isInGame) {
                        if (!gameInstance.cheats) {
                            gameInstance.cheats = {};
                        }
                        // Merge die neuen cheats
                        Object.assign(gameInstance.cheats, cheats);
                        console.log("Farkle | Loaded dice set for game:", gameId, gameInstance.cheats);
                    }
                }
            }
        }
        
        this.close();
    }

    _onClickAction(event, target) {
        const action = target.dataset.action;
        switch (action) {
            case "confirmSelection":
                event.preventDefault();
                this._confirmSelection();
                return;
            case "pickDie":
                event.preventDefault();
                this._pickDie({currentTarget: target});
                return;
            default:
                return super._onClickAction(event, target);
        }
    }
}
