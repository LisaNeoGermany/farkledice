import { FarkleApplication } from "./FarkleApplication.js";
import FarkleHelp from "./FarkleHelp.js";
import DiceLoader from "./DiceLoader.js";
import StatsViewer from "./StatsViewer.js";
import AchievementViewer from "./AchievementViewer.js";
import { moduleName, moduleDebug } from "./utils.js";
import PlayerPick from "./PlayerPick.js";
import PlayerPickJoin from "./PlayerPickJoin.js";

const { isEmpty } = foundry.utils;
const { DialogV2 } = foundry.applications.api;

export default class FarkleLobby extends FarkleApplication {
    static DEFAULT_OPTIONS = {
        id: "farkle-lobby",
        classes: ["farkle-scorer"],
        window: {
            title: "Farkle Lobby",
            resizable: true,
            contentClasses: ["standard-form"]
        },
        position: {
            width: 800,
            height: 600
        }
    };

    static PARTS = {
        body: {
            root: true,
            template: "modules/farkledice/templates/lobby.hbs"
        }
    };

    get title() {
        return game.i18n.localize("FARKLE.lobby");
    }

    _getHeaderButtons() {
        const buttons = super._getHeaderButtons();

        buttons.unshift({
            label: game.i18n.localize("FARKLE.help"),
            class: "show-help",
            icon: "fas fa-question",
            onclick: () => this._showHelp()
        });

        if (game.user.isGM) {
            buttons.unshift({
                label: game.i18n.localize("FARKLE.loadDice"),
                class: "load-dice",
                icon: "fas fa-dice",
                onclick: () => this._loadDice()
            });
        }

        return buttons;
    }

    _showHelp() {
        new FarkleHelp().render(true);
    }

    _loadDice() {
        new DiceLoader().render(true);
    }

    async _prepareContext(options) {
        const context = {};
        const games = game.modules.get(moduleName).games || {};

        console.log("Farkle | Lobby _prepareContext - games:", Object.keys(games));

        context.games = Object.entries(games).map(([gameId, gameInstance]) => {
            const state = gameInstance.gameState || {};
            const creator = game.users.get(state.createdBy);

            console.log("Farkle | Processing game:", gameId, "state:", state, "isEmpty:", isEmpty(state));

            return {
                id: gameId,
                name: state.gameName || "Unnamed Game",
                players: (state.users || []).map(u => u.name).join(", "),
                playerCount: (state.users || []).length,
                stake: Number(state.stake || 0),
                creator: creator?.name || "Unknown",
                started: !isEmpty(state) && state.users && state.users.length > 0,
                currentPlayer: state.users && state.users[state.userTurn] ? state.users[state.userTurn].name : "-"
            };
        }).filter(g => g.started);

        console.log("Farkle | Lobby - filtered games:", context.games);

        context.hasGames = context.games.length > 0;

        return context;
    }

    _createNewGame() {
        moduleDebug("Create Game dialog opened");
        const dialog = new DialogV2({
            window: { title: game.i18n.localize("FARKLE.createGame") },
            content: `
            <div class="form-group">
                <label>${game.i18n.localize("FARKLE.gameName")}:</label>
                <input type="text" name="gameName" value="${game.user.name}'s Game" autofocus/>
            </div>
            <div class="form-group">
                <label>${game.i18n.localize("FARKLE.gameMode")}:</label>
                <select name="gameMode" id="farkle-game-mode" style="width: 100%; padding: 6px;">
                    <option value="normal">Normal (10000 Punkte)</option>
                    <option value="blitz">Blitz (5000 Punkte)</option>
                </select>
            </div>
            <div class="form-group">
                <label>${game.i18n.localize("FARKLE.stake")}:</label>
                <input type="number" name="stake" value="0" min="0" step="1"/>
            </div>
        `,
            buttons: [{
                action: "create",
                label: game.i18n.localize("FARKLE.create"),
                icon: "fa-solid fa-check",
                default: true,
                callback: (_event, button) => {
                    moduleDebug("Create Game confirmed");
                    const form = button?.form;
                    const gameName = form?.gameName?.value || `${game.user.name}'s Game`;
                    const gameMode = form?.gameMode?.value || "normal";
                    const targetScore = gameMode === "blitz" ? 5000 : 10000;
                    const stake = parseInt(form?.stake?.value || 0, 10);
                    const gameId = foundry.utils.randomID();

                    moduleDebug("Creating game", { gameId, gameName, gameMode, targetScore, stake });
                    game.modules.get(moduleName).api.createGame(gameId);
                    const gameInstance = game.modules.get(moduleName).games[gameId];

                    // Öffne Spieler-Auswahl und reiche Zielpunkte und Einsatz weiter
                    new PlayerPick(gameId, gameName, targetScore, stake).render(true);
                }
            }, {
                action: "cancel",
                label: game.i18n.localize("cancel"),
                icon: "fa-solid fa-times"
            }]
        });
        dialog.render({ force: true });
    }

    _joinGame(gameId) {
        moduleDebug("Join requested", gameId);
        const gameInstance = game.modules.get(moduleName).games[gameId];
        
        // Wenn der User bereits im Spiel ist, öffne es direkt
        if (gameInstance) {
            const isInGame = gameInstance.gameState?.users?.some(u => u.id === game.user.id);
            if (isInGame) {
                moduleDebug("Already in game, rendering scorer", gameId);
                gameInstance.isSpectator = false;
                gameInstance.render(true);
                return;
            }
        }

        const doJoin = (isSpectator = false) => {
            if (gameInstance) {
                if (isSpectator) {
                    moduleDebug("Spectating game", gameId);
                    gameInstance.isSpectator = true;
                    gameInstance.render(true);
                    return;
                }

                if (gameInstance.gameState?.users) {
                    // User ist nicht im Spiel - öffne Charakterauswahl
                    moduleDebug("Joining existing remote game, opening player pick", gameId);
                    new PlayerPickJoin(gameId, gameInstance.gameState.gameName).render(true);
                }
            } else {
                // Spiel existiert noch nicht lokal - erstelle es
                moduleDebug("Creating local game stub before join", gameId);
                game.modules.get(moduleName).api.createGame(gameId);
                const newInstance = game.modules.get(moduleName).games[gameId];

                // Warte kurz und öffne dann Charakterauswahl
                setTimeout(() => {
                    if (isSpectator) {
                        moduleDebug("Spectating newly created stub", gameId);
                        newInstance.isSpectator = true;
                        newInstance.render(true);
                    } else {
                        moduleDebug("Opening join dialog for newly created stub", gameId);
                        new PlayerPickJoin(gameId, "Farkle Game").render(true);
                    }
                }, 100);
            }
        };

        new DialogV2({
            window: { title: game.i18n.localize("FARKLE.joinGame") },
            content: `<p>${game.i18n.localize("FARKLE.joinModeDescription")}</p>`,
            buttons: [{
                action: "play",
                label: game.i18n.localize("FARKLE.play"),
                icon: "fa-solid fa-dice",
                default: true,
                callback: () => doJoin(false)
            }, {
                action: "spectate",
                label: game.i18n.localize("FARKLE.spectate"),
                icon: "fa-solid fa-eye",
                callback: () => doJoin(true)
            }]
        }).render({ force: true });
    }

    _onClickAction(event, target) {
        const action = target.dataset.action;
        switch (action) {
            case "createGame":
                event.preventDefault();
                moduleDebug("Create game action");
                this._createNewGame();
                return;
            case "joinGame": {
                event.preventDefault();
                const gameId = target.dataset.gameid;
                moduleDebug("Join game action", { gameId });
                this._joinGame(gameId);
                return;
            }
            case "showAchievements":
                event.preventDefault();
                moduleDebug("Show achievements action");
                new AchievementViewer().render(true);
                return;
            case "showStats":
                event.preventDefault();
                moduleDebug("Show stats action");
                new StatsViewer().render(true);
                return;
            case "showHelp":
                event.preventDefault();
                moduleDebug("Show help action");
                this._showHelp();
                return;
            case "refresh":
                event.preventDefault();
                moduleDebug("Refresh lobby action");
                this.render(false);
                return;
            default:
                return super._onClickAction(event, target);
        }
    }
}
