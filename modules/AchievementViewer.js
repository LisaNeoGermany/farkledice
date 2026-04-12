/**
 * Farkle Achievement Viewer
 * Displays player achievements
 */

import { FarkleApplication } from "./FarkleApplication.js";
import { moduleName } from "./utils.js";
import { ACHIEVEMENTS, achievementManager } from "./Achievements.js";

export default class AchievementViewer extends FarkleApplication {
    static DEFAULT_OPTIONS = {
        id: "farkle-achievements-{id}",
        classes: ["farkle-achievements-viewer"],
        window: {
            title: "Farkle Achievements",
            resizable: true
        },
        position: {
            width: 800,
            height: "auto"
        },
        actions: {
            close: AchievementViewer.prototype._closeViewer,
            postToChat: AchievementViewer.prototype._postToChat
        }
    };

    static PARTS = {
        achievements: {
            template: "modules/farkledice/templates/achievements.hbs"
        }
    };

    get title() {
        return game.i18n.localize("FARKLE.myAchievements");
    }

    async _prepareContext(options) {
        const context = {};

        // Get stats for current user only
        const stats = achievementManager.getPlayerStats(game.user.id);
        context.stats = stats;

        // Get achievements
        context.achievements = Object.values(ACHIEVEMENTS).map(achievement => {
            const unlocked = stats.achievements?.includes(achievement.id) || false;
            const progress = this._getAchievementProgress(achievement, stats);

            return {
                ...achievement,
                unlocked,
                progress,
                name: game.i18n.localize(achievement.name),
                description: game.i18n.localize(achievement.description)
            };
        });

        context.unlockedCount = context.achievements.filter(a => a.unlocked).length;
        context.totalCount = context.achievements.length;
        context.achievementProgress = context.totalCount > 0
            ? Math.round((context.unlockedCount / context.totalCount) * 100)
            : 0;

        return context;
    }

    /**
     * Get progress towards an achievement
     */
    _getAchievementProgress(achievement, stats) {
        if (achievement.id === 'hot_dice_master') {
            return { current: stats.hotDiceCount || 0, target: 10 };
        } else if (achievement.id === 'high_roller') {
            return { current: stats.highestTurnScore || 0, target: 1500 };
        } else if (achievement.id === 'no_fear') {
            return { current: stats.singleDieRolls || 0, target: 5 };
        } else if (achievement.id === 'farkle_king') {
            return { current: stats.consecutiveFarkles || 0, target: 3 };
        } else if (achievement.id === 'first_win') {
            return { current: stats.gamesWon || 0, target: 1 };
        } else if (achievement.id === 'perfect_score') {
            return { current: stats.perfectGames || 0, target: 1 };
        } else if (achievement.id === 'comeback_kid') {
            return { current: stats.comebacks || 0, target: 1 };
        } else if (achievement.id === 'veteran') {
            return { current: stats.gamesPlayed || 0, target: 50 };
        }

        return { current: 0, target: 1 };
    }

    async _postToChat(event, target) {
        const stats = achievementManager.getPlayerStats(game.user.id);

        // Get achievements with unlock status
        const achievements = Object.values(ACHIEVEMENTS).map(achievement => {
            const unlocked = stats.achievements?.includes(achievement.id) || false;
            return {
                ...achievement,
                unlocked,
                name: game.i18n.localize(achievement.name),
                description: game.i18n.localize(achievement.description)
            };
        });

        const unlockedCount = achievements.filter(a => a.unlocked).length;
        const totalCount = achievements.length;

        // Build chat message content mirroring the statistics card layout
        let content = `
            <div class="farkle-chat-achievements" style="background: var(--color-bg-secondary); border: 1px solid var(--color-border-light-tertiary); border-radius: 8px; padding: 12px;">
                <h3 style="margin: 0 0 8px 0; padding-bottom: 8px; border-bottom: 1px solid var(--color-border-light-tertiary); font-size: 1.1rem;">
                    <i class="fas fa-medal"></i> ${game.i18n.format("FARKLE.postedAchievements", { name: game.user.name })}
                </h3>
                <p style="margin: 0 0 12px 0; color: var(--color-text-light-2);">
                    <strong>${unlockedCount}/${totalCount}</strong> ${game.i18n.localize("FARKLE.unlocked")}
                </p>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
        `;

        achievements.forEach(achievement => {
            const status = achievement.unlocked
                ? game.i18n.localize("FARKLE.achievementUnlockedStatus")
                : game.i18n.localize("FARKLE.achievementLocked");
            const lockIcon = achievement.unlocked ? "fas fa-lock-open" : "fas fa-lock";
            const accent = achievement.unlocked ? "var(--color-text-hyperlink)" : "var(--color-border-light-highlight)";
            const opacity = achievement.unlocked ? 1 : 0.75;

            content += `
                <div style="background: var(--color-bg-primary); padding: 10px; border-radius: 6px; border: 1px solid var(--color-border-light-2); border-left: 4px solid ${accent}; opacity: ${opacity}; display: flex; flex-direction: column; align-items: center; gap: 6px;">
                    <div style="font-size: 1.25rem; width: 100%; text-align: center; line-height: 1;">${achievement.icon}</div>
                    <strong style="text-align: center;">${achievement.name}</strong>
                    <div style="font-size: 1.1rem; color: ${accent};" title="${status}">
                        <i class="${lockIcon}"></i>
                    </div>
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

    _closeViewer() {
        this.close();
    }
}
