import { FarkleApplication } from "./FarkleApplication.js";
import { moduleDebug, resolveRootElement } from "./utils.js";

export default class DiceLoader extends FarkleApplication {
    static DEFAULT_OPTIONS = {
        id: "farkle-dice-loader",
        classes: ["farkle-scorer"],
        dragDrop: [
            {
                dropSelector: ".farkle-drop-zone"
            }
        ],
        window: {
            title: "Farkle",
            resizable: true,
            contentClasses: ["standard-form"]
        },
        position: {
            width: 500
        }
    };

    static PARTS = {
        body: {
            root: true,
            template: "modules/farkledice/templates/diceLoader.hbs"
        }
    };

    get title() {
        return game.i18n.localize("FARKLE.loadDice");
    }

    constructor(options = {}) {
        super(options);
        this.item = null;
    }

    async _prepareContext(options) {
        const context = {};
        context.item = this.item;
        if (this.item) {
            const loaded = this.item?.flags?.farkledice?.loaded || [];
            const weigths = loaded.length ? loaded : [1, 1, 1, 1, 1, 1];
            const weightSum = weigths.reduce((sum, current) => sum + current, 0);
            context.sides = weigths.map((weight, index) => {
                return {
                    index: index + 1,
                    weight,
                    cssClass: weight > 1 ? 'load' : '',
                    probability: (weight / weightSum * 100).toFixed(1),
                }
            })
        }
        return context;
    }

    async _clearLoaded() {
        await this.item.update({ [`flags.-=farkledice`]: null });
        this.render(true);
    }

    async _loadDice() {
        const root = resolveRootElement(null, this.element);
        if (!root) {
            moduleDebug("DiceLoader load missing root");
            return;
        }
        const loads = root.querySelectorAll('.load');
        const values = Array.from(loads).map(input => parseInt(input.value) || 1);
        await this.item.update({
            [`flags.farkledice.loaded`]: values
        });
        ui.notifications.info(game.i18n.localize("FARKLE.loadedDice"));
        this.render(true);
    }

    _canDragStart() {
        return false;
    }

    _canDragDrop() {
        return true;
    }

    _onRender(context, options) {
        super._onRender(context, options);

        if (this._diceLoaderDropCleanup) {
            this._diceLoaderDropCleanup();
            this._diceLoaderDropCleanup = null;
        }

        const html = this.element;
        const root = resolveRootElement(html, this.element);
        const elementRoot = resolveRootElement(this.element, null);
        const windowContent = elementRoot?.querySelector?.(".window-content");
        const dropZone = elementRoot?.querySelector?.(".farkle-drop-zone") || root?.querySelector?.(".farkle-drop-zone");
        const dropTargets = new Set([dropZone, windowContent, root, elementRoot].filter(Boolean));

        if (!dropTargets.size) {
            moduleDebug("DiceLoader listeners missing root");
            return;
        }

        const isEventInside = (event) => {
            const path = event.composedPath?.() || [];
            if (root && path.includes(root)) return true;
            if (elementRoot && path.includes(elementRoot)) return true;
            if (elementRoot && event.target instanceof HTMLElement) {
                return elementRoot.contains(event.target);
            }
            return false;
        };

        const onDragOver = (event) => {
            if (!isEventInside(event)) return;
            event.preventDefault();
            event.stopPropagation();
        };

        const onDrop = async (event) => {
            if (!isEventInside(event)) return;
            if (event.farkleDiceLoaderDropHandled) return;
            event.farkleDiceLoaderDropHandled = true;
            event.preventDefault();
            event.stopPropagation();
            await this._onDrop(event);
        };

        for (const target of dropTargets) {
            target.addEventListener('dragover', onDragOver, true);
            target.addEventListener('drop', onDrop, true);
        }
        const ownerDoc = elementRoot?.ownerDocument;
        if (ownerDoc) {
            ownerDoc.addEventListener('dragover', onDragOver, true);
            ownerDoc.addEventListener('drop', onDrop, true);
        }
        this._diceLoaderDropCleanup = () => {
            for (const target of dropTargets) {
                target.removeEventListener('dragover', onDragOver, true);
                target.removeEventListener('drop', onDrop, true);
            }
            if (ownerDoc) {
                ownerDoc.removeEventListener('dragover', onDragOver, true);
                ownerDoc.removeEventListener('drop', onDrop, true);
            }
        };

        const updateProbabilities = () => {
            const loadInputs = Array.from(root.querySelectorAll('.load'));
            const weights = loadInputs.map(input => parseInt(input.value) || 1);
            const weightSum = weights.reduce((sum, current) => sum + current, 0) || 1;
            loadInputs.forEach((input) => {
                const newWeight = parseInt(input.value) || 1;
                const newProbability = (newWeight / weightSum * 100).toFixed(1);
                const parent = input.closest('.farkle-flexrow');
                const probEl = parent?.querySelector('.probability');
                if (probEl) probEl.textContent = `${newProbability} %`;
            });
        };

        root.querySelectorAll('.load').forEach(input => {
            input?.addEventListener('change', updateProbabilities);
        });
    }

    _onClickAction(event, target) {
        const action = target.dataset.action;
        switch (action) {
            case "loadDice":
                event.preventDefault();
                this._loadDice();
                return;
            case "clearLoaded":
                event.preventDefault();
                this._clearLoaded();
                return;
            default:
                return super._onClickAction(event, target);
        }
    }

    async _onDrop(event) {
        let dragData;
        try {
            const textEditor = foundry?.applications?.ux?.TextEditor?.implementation || (typeof TextEditor !== "undefined" ? TextEditor : null);
            if (textEditor?.getDragEventData) {
                dragData = textEditor.getDragEventData(event);
            } else {
                const raw = event.dataTransfer.getData('text/plain') || event.dataTransfer.getData('text');
                dragData = JSON.parse(raw);
            }
        } catch (err) {
            console.error("Farkle | Error parsing drag data:", err);
            return;
        }

        if (!dragData || dragData.type !== 'Item') {
            console.log("Farkle | Dropped data is not an Item");
            return;
        }

        console.log("Farkle | Item dropped:", dragData);

        const item = await fromUuid(dragData.uuid);
        if (!item) {
            console.error("Farkle | Could not find item with UUID:", dragData.uuid);
            ui.notifications.error("Item konnte nicht gefunden werden!");
            return;
        }

        console.log("Farkle | Item loaded:", item.name);
        this.item = item;
        this.render(true);
    }

    async close(options = {}) {
        if (this._diceLoaderDropCleanup) {
            this._diceLoaderDropCleanup();
            this._diceLoaderDropCleanup = null;
        }
        return super.close(options);
    }
}
