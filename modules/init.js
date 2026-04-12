import FarkleLobby from "./FarkleLobby.js";
import FarkleScorer from "./FarkleScorer.js";
import FarkleStart from "./FarkleStart.js";
import StatsViewer from "./StatsViewer.js";
import AchievementViewer from "./AchievementViewer.js";
import FarkleHelp from "./FarkleHelp.js";
import DiceLoader from "./DiceLoader.js";
import FarkleResetStats from "./FarkleResetStats.js";
import { moduleName, moduleDebug, getOpenApplicationsOfType } from "./utils.js";
import { achievementManager, ACHIEVEMENTS } from "./Achievements.js";
import { soundEffects } from "./SoundEffects.js";

Hooks.once("init", async () => {
    game.settings.register(moduleName, "debug", {
        name: "FARKLE.debugName",
        hint: "FARKLE.debugHint",
        scope: "client",
        config: true,
        type: Boolean,
        default: false
    });

    game.settings.register(moduleName, "soundEffects", {
        name: "FARKLE.soundEffectsName",
        hint: "FARKLE.soundEffectsHint",
        scope: "client",
        config: true,
        type: Boolean,
        default: true
    });

    game.settings.register(moduleName, "rollAnimations", {
        name: "FARKLE.rollAnimationsName",
        hint: "FARKLE.rollAnimationsHint",
        scope: "client",
        config: true,
        type: Boolean,
        default: true
    });

    game.settings.register(moduleName, "achievementNotifications", {
        name: "FARKLE.achievementNotificationsName",
        hint: "FARKLE.achievementNotificationsHint",
        scope: "client",
        config: true,
        type: Boolean,
        default: true
    });

    game.settings.register(moduleName, "defaultTargetScore", {
        name: "FARKLE.defaultTargetScoreName",
        hint: "FARKLE.defaultTargetScoreHint",
        scope: "world",
        config: true,
        type: Number,
        default: 10000,
        range: {
            min: 1000,
            max: 50000,
            step: 1000
        }
    });

    game.settings.register(moduleName, "apiUrl", {
        name: "FARKLE.apiUrlName",
        hint: "FARKLE.apiUrlHint",
        scope: "world",
        config: true,
        type: String,
        default: "http://localhost:5000/api"
    });

    game.settings.register(moduleName, "apiKey", {
        name: "FARKLE.apiKeyName",
        hint: "FARKLE.apiKeyHint",
        scope: "world",
        config: true,
        type: String,
        default: "farkle_secret"
    });

    // Register Settings Menus
    game.settings.registerMenu(moduleName, "farkleHelp", {
        name: "FARKLE.farkleHelpName",
        label: "FARKLE.farkleHelpLabel",
        hint: "FARKLE.farkleHelpHint",
        icon: "fas fa-question-circle",
        type: FarkleHelp,
        restricted: false
    });

    game.settings.registerMenu(moduleName, "diceLoader", {
        name: "FARKLE.loadedDiceName",
        label: "FARKLE.loadedDiceLabel",
        hint: "FARKLE.loadedDiceHint",
        icon: "fas fa-dice",
        type: DiceLoader,
        restricted: true
    });

    game.settings.registerMenu(moduleName, "farkleResetStats", {
        name: "FARKLE.resetStatsName",
        label: "FARKLE.resetStatsName",
        hint: "FARKLE.resetStatsHint",
        icon: "fas fa-trash",
        type: FarkleResetStats,
        restricted: true
    });

    // Register Handlebars helpers
    Handlebars.registerHelper('percentage', function(value, max) {
        if (!max || max === 0) return 0;
        const percentage = Math.min(100, Math.round((value / max) * 100));
        return percentage;
    });

    Handlebars.registerHelper('eq', function(a, b) {
        return a === b;
    });

    Handlebars.registerHelper('ifThen', function(condition, yes, no) {
        return condition ? yes : no;
    });

    // Register Handlebars partials
    const partials = [
        "modules/farkledice/templates/playerrow.hbs"
    ];

    for (let partial of partials) {
        const response = await fetch(partial);
        const html = await response.text();
        // Register with full path as partial name
        Handlebars.registerPartial(partial, html);
        moduleDebug("Registered partial", partial);
    }
});

Hooks.once("ready", async () => {
    moduleDebug("Farkle module ready");
    // Initialisiere globales Spiele-Management
    if (!game.modules.get(moduleName).games) {
        game.modules.get(moduleName).games = {};
    }

    game.modules.get(moduleName).api = {
        // === UI Methods ===

        /**
         * Open the Farkle lobby
         */
        farkle: () => {
            moduleDebug("Opening Farkle lobby from API");
            new FarkleLobby().render(true);
        },

        /**
         * Open the statistics viewer
         */
        stats: () => {
            moduleDebug("Opening Farkle stats viewer from API");
            new StatsViewer().render(true);
        },

        /**
         * Open the achievements viewer
         */
        achievements: () => {
            moduleDebug("Opening Farkle achievements viewer from API");
            new AchievementViewer().render(true);
        },

        /**
         * Create or open a game instance
         * @param {string} gameId - Unique game identifier
         */
        createGame: (gameId) => {
            if (!game.modules.get(moduleName).games[gameId]) {
                game.modules.get(moduleName).games[gameId] = new FarkleScorer(gameId);
            }
            moduleDebug("Opening existing game window", gameId);
            game.modules.get(moduleName).games[gameId].render(true);
        },

        /**
         * Close a game instance
         * @param {string} gameId - Unique game identifier
         */
        closeGame: (gameId) => {
            if (game.modules.get(moduleName).games[gameId]) {
                moduleDebug("Closing game via API", gameId);
                game.modules.get(moduleName).games[gameId].close();
                delete game.modules.get(moduleName).games[gameId];
            }
        },

        /**
         * Get a game instance
         * @param {string} gameId - Unique game identifier
         * @returns {FarkleScorer|null} Game instance or null
         */
        getGame: (gameId) => {
            return game.modules.get(moduleName).games[gameId] || null;
        },

        /**
         * Get all active games
         * @returns {Object} Object containing all active games
         */
        getAllGames: () => {
            return game.modules.get(moduleName).games;
        },

        // === Achievement Methods ===

        /**
         * Get achievement manager
         * @returns {AchievementManager} Achievement manager instance
         */
        getAchievementManager: () => {
            return achievementManager;
        },

        /**
         * Get all achievements
         * @returns {Object} Object containing all achievement definitions
         */
        getAchievements: () => {
            return ACHIEVEMENTS;
        },

        /**
         * Get player statistics
         * @param {string} userId - User ID
         * @returns {Object} Player statistics
         */
        getPlayerStats: (userId) => {
            return achievementManager.getPlayerStats(userId);
        },

        /**
         * Award a custom achievement to a player
         * @param {string} userId - User ID
         * @param {Object} achievement - Achievement object with id, name, description, icon
         */
        awardAchievement: async (userId, achievement) => {
            await achievementManager.unlockAchievement(userId, achievement);
        },

        // === Sound Methods ===

        /**
         * Get sound effects manager
         * @returns {SoundEffectsManager} Sound effects manager instance
         */
        getSoundEffects: () => {
            return soundEffects;
        },

        /**
         * Play a sound effect
         * @param {string} soundKey - Sound key (roll, keep, farkle, hotDice, achievement, winner, endTurn)
         * @param {Object} options - Optional AudioHelper options override
         */
        playSound: async (soundKey, options = {}) => {
            await soundEffects.play(soundKey, options);
        },

        /**
         * Register a custom sound
         * @param {string} key - Sound key identifier
         * @param {string} src - Sound file path
         * @param {number} volume - Volume level (0-1)
         */
        registerSound: (key, src, volume = 0.5) => {
            soundEffects.registerSound(key, src, volume);
        },

        // === Utility Methods ===

        /**
         * Get module name
         * @returns {string} Module name
         */
        getModuleName: () => {
            return moduleName;
        },

        /**
         * Check if debug mode is enabled
         * @returns {boolean} Debug status
         */
        isDebugEnabled: () => {
            return game.settings.get(moduleName, "debug");
        },

        /**
         * Get module version
         * @returns {string} Module version
         */
        getVersion: () => {
            return game.modules.get(moduleName).version;
        }
    }

    // Erstelle Farkle Makro automatisch falls es noch nicht existiert
    const existingMacro = game.macros.find(m => m.name === "Farkle" && m.getFlag("farkledice", "auto-created"));
    if (!existingMacro) {
        try {
            await Macro.create({
                name: "Farkle",
                type: "script",
                img: "icons/svg/d20-grey.svg",
                command: "game.modules.get('farkledice').api.farkle();",
                flags: {
                    farkledice: {
                        "auto-created": true
                    }
                }
            });
            console.log("Farkle | Auto-created Farkle macro");
        } catch (error) {
            console.warn("Farkle | Could not auto-create macro:", error);
        }
    }

    game.socket.on(`module.${moduleName}`, (data) => {
        const gameId = data.gameId;
        
        console.log("Farkle | Socket event received:", data.type, "gameId:", gameId);
        
        if (gameId && game.modules.get(moduleName).games[gameId]) {
            game.modules.get(moduleName).games[gameId].socketEvents(data);
        }

        switch (data.type) {
            case 'sync':
                if (!game.modules.get(moduleName).games[gameId]) {
                    game.modules.get(moduleName).games[gameId] = new FarkleScorer(gameId);
                    game.modules.get(moduleName).games[gameId].socketEvents(data);
                }
                break;
            case 'close':
                // Wenn closeAll gesetzt ist, schließe das Spiel für alle
                if (data.payload.closeAll) {
                    if (game.modules.get(moduleName).games[gameId]) {
                        game.modules.get(moduleName).games[gameId].close();
                        delete game.modules.get(moduleName).games[gameId];
                        ui.notifications.info(game.i18n.localize("FARKLE.gameEnded"));
                    }
                } else if (game.modules.get(moduleName).games[gameId]) {
                    game.modules.get(moduleName).games[gameId].close();
                    delete game.modules.get(moduleName).games[gameId];
                }
                break;
            case 'lobby-update':
                moduleDebug("Socket lobby-update received", data.payload);
                
                // Aktualisiere die Lobby wenn sie offen ist
                for (const app of getOpenApplicationsOfType(FarkleLobby)) {
                    moduleDebug("Refreshing lobby window");
                    app.render(false);
                }
                
                // Stelle sicher dass das Spiel auch lokal existiert wenn es auf anderen Clients erstellt wurde
                if (gameId && !game.modules.get(moduleName).games[gameId]) {
                    if (data.payload?.gameState) {
                        moduleDebug("Creating game locally from lobby sync", gameId);
                        const newGame = new FarkleScorer(gameId);
                        game.modules.get(moduleName).games[gameId] = newGame;
                        const newState = data.payload.gameState;
                        newState.skipSync = true;
                        newGame.gameState = newState;
                    }
                } else if (gameId && game.modules.get(moduleName).games[gameId]) {
                    moduleDebug("Game already existed locally", gameId);
                }
                break;
            case 'request-lobby-sync':
                moduleDebug("Socket request-lobby-sync received from", data.userId);
                // Sende alle Spiele, für die ich der Creator bin, an den neuen Spieler
                const myGames = game.modules.get(moduleName).games || {};
                for (const [gid, inst] of Object.entries(myGames)) {
                    if (inst.gameState?.createdBy === game.user.id || game.user.isGM) {
                        game.socket.emit(`module.${moduleName}`, {
                            type: 'lobby-update',
                            gameId: gid,
                            payload: {
                                gameState: inst.gameState
                            }
                        });
                    }
                }
                break;
            default:
                break;
        }
    });

    // Fordere aktuelle Spiele von anderen Clients an (für Spieler die später joinen)
    setTimeout(() => {
        moduleDebug("Requesting lobby sync from other clients");
        game.socket.emit(`module.${moduleName}`, {
            type: 'request-lobby-sync',
            userId: game.user.id
        });
    }, 1000);

});