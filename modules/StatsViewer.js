/**
 * Farkle Statistics Viewer
 * Displays player statistics (without achievements)
 */

import { FarkleApplication } from "./FarkleApplication.js";
import { moduleName } from "./utils.js";
import { achievementManager } from "./Achievements.js";

export default class StatsViewer extends FarkleApplication {
    static DEFAULT_OPTIONS = {
        id: "farkle-stats-{id}",
        classes: ["farkle-stats-viewer"],
        window: {
            title: "Farkle Statistiken",
            resizable: true
        },
        position: {
            width: 800,
            height: "auto"
        },
        actions: {
            close: StatsViewer.prototype._closeStats,
            postToChat: StatsViewer.prototype._postToChat
        }
    };

    static PARTS = {
        stats: {
            template: "modules/farkledice/templates/stats.hbs"
        }
    };

    get title() {
        return game.i18n.localize("FARKLE.myStats");
    }

    async _prepareContext(options) {
        const context = {};

        // Get stats for current user only
        const stats = achievementManager.getPlayerStats(game.user.id);
        context.stats = stats;

        // Calculate derived stats
        context.winRate = stats.gamesPlayed > 0
            ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
            : 0;

        context.averageScore = stats.gamesPlayed > 0
            ? Math.round(stats.totalScore / stats.gamesPlayed)
            : 0;

        context.farkleRate = stats.gamesPlayed > 0
            ? (stats.farkleCount / stats.gamesPlayed).toFixed(1)
            : 0;

        return context;
    }

    async _postToChat(event, target) {
        const stats = achievementManager.getPlayerStats(game.user.id);

        // Calculate derived stats
        const winRate = stats.gamesPlayed > 0
            ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
            : 0;

        const averageScore = stats.gamesPlayed > 0
            ? Math.round(stats.totalScore / stats.gamesPlayed)
            : 0;

        const farkleRate = stats.gamesPlayed > 0
            ? (stats.farkleCount / stats.gamesPlayed).toFixed(1)
            : 0;

        const statsList = [
            { icon: 'fas fa-gamepad', label: game.i18n.localize("FARKLE.stats.gamesPlayed"), value: stats.gamesPlayed || 0 },
            { icon: 'fas fa-trophy', label: game.i18n.localize("FARKLE.stats.gamesWon"), value: stats.gamesWon || 0 },
            { icon: 'fas fa-percent', label: game.i18n.localize("FARKLE.stats.winRate"), value: `${winRate}%` },
            { icon: 'fas fa-calculator', label: game.i18n.localize("FARKLE.stats.totalScore"), value: stats.totalScore || 0 },
            { icon: 'fas fa-chart-line', label: game.i18n.localize("FARKLE.stats.averageScore"), value: averageScore },
            { icon: 'fas fa-star', label: game.i18n.localize("FARKLE.stats.bestTurn"), value: stats.highestTurnScore || 0 },
            { icon: 'fas fa-fire', label: game.i18n.localize("FARKLE.stats.hotDice"), value: stats.hotDiceCount || 0 },
            { icon: 'fas fa-skull', label: game.i18n.localize("FARKLE.stats.farkles"), value: stats.farkleCount || 0 },
            { icon: 'fas fa-chart-pie', label: game.i18n.localize("FARKLE.stats.farklesPerGame"), value: farkleRate },
            { icon: 'fas fa-dice-one', label: game.i18n.localize("FARKLE.stats.singleDieRolls"), value: stats.singleDieRolls || 0 },
            { icon: 'fas fa-medal', label: game.i18n.localize("FARKLE.stats.perfectGames"), value: stats.perfectGames || 0 },
            { icon: 'fas fa-arrow-up', label: game.i18n.localize("FARKLE.stats.comebacks"), value: stats.comebacks || 0 }
        ];

        // Build chat message content
        let content = `
            <div class="farkle-chat-stats" style="background: var(--color-bg-secondary); border: 1px solid var(--color-border-light-tertiary); border-radius: 8px; padding: 12px;">
                <h3 style="margin: 0 0 8px 0; padding-bottom: 8px; border-bottom: 1px solid var(--color-border-light-tertiary); font-size: 1.1rem;"><i class="fas fa-chart-bar"></i> ${game.i18n.format("FARKLE.postedStats", { name: game.user.name })}</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
        `;

        statsList.forEach(stat => {
            content += `
                <div style="display: flex; align-items: center; background: var(--color-bg-primary); padding: 6px 8px; border-radius: 4px; border: 1px solid var(--color-border-light-tertiary);">
                    <i class="${stat.icon}" style="width: 24px; text-align: center; margin-right: 8px; color: var(--color-text-light-4);"></i>
                    <span style="flex: 1;">${stat.label}</span>
                    <strong style="font-weight: 600;">${stat.value}</strong>
                </div>
            `;
        });

        content += `</div></div>`;

        // Create chat message
        await ChatMessage.create({
            user: game.user.id,
            speaker: ChatMessage.getSpeaker({ user: game.user }),
            content: content
        });
    }

    _closeStats() {
        this.close();
    }
}
