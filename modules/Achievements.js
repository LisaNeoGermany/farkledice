/**
 * Farkle Achievements System
 * Tracks player achievements and displays notifications
 */

import { moduleName } from "./utils.js";
import { soundEffects } from "./SoundEffects.js";

export const ACHIEVEMENTS = {
    HOT_DICE_MASTER: {
        id: 'hot_dice_master',
        name: 'FARKLE.achievements.hotDiceMaster',
        description: 'FARKLE.achievements.hotDiceMasterDesc',
        icon: '🔥',
        condition: (stats) => stats.hotDiceCount >= 10
    },
    HIGH_ROLLER: {
        id: 'high_roller',
        name: 'FARKLE.achievements.highRoller',
        description: 'FARKLE.achievements.highRollerDesc',
        icon: '💎',
        condition: (stats) => stats.highestTurnScore >= 1500
    },
    NO_FEAR: {
        id: 'no_fear',
        name: 'FARKLE.achievements.noFear',
        description: 'FARKLE.achievements.noFearDesc',
        icon: '🎲',
        condition: (stats) => stats.singleDieRolls >= 5
    },
    FARKLE_KING: {
        id: 'farkle_king',
        name: 'FARKLE.achievements.farkleKing',
        description: 'FARKLE.achievements.farkleKingDesc',
        icon: '💀',
        condition: (stats) => stats.consecutiveFarkles >= 3
    },
    FIRST_WIN: {
        id: 'first_win',
        name: 'FARKLE.achievements.firstWin',
        description: 'FARKLE.achievements.firstWinDesc',
        icon: '🏆',
        condition: (stats) => stats.gamesWon >= 1
    },
    PERFECT_SCORE: {
        id: 'perfect_score',
        name: 'FARKLE.achievements.perfectScore',
        description: 'FARKLE.achievements.perfectScoreDesc',
        icon: '⭐',
        condition: (stats) => stats.perfectGames >= 1
    },
    COMEBACK_KID: {
        id: 'comeback_kid',
        name: 'FARKLE.achievements.comebackKid',
        description: 'FARKLE.achievements.comebackKidDesc',
        icon: '🔄',
        condition: (stats) => stats.comebacks >= 1
    },
    VETERAN: {
        id: 'veteran',
        name: 'FARKLE.achievements.veteran',
        description: 'FARKLE.achievements.veteranDesc',
        icon: '🎖️',
        condition: (stats) => stats.gamesPlayed >= 50
    }
};

export class AchievementManager {
    constructor() {
        this.playerStats = {};
    }

    /**
     * Get player statistics
     */
    getPlayerStats(userId) {
        const flagPath = `flags.${moduleName}.stats`;
        const user = game.users.get(userId);
        if (!user) return this.getDefaultStats();

        const stats = foundry.utils.getProperty(user, flagPath) || this.getDefaultStats();
        return stats;
    }

    /**
     * Get default stats structure
     */
    getDefaultStats() {
        return {
            gamesPlayed: 0,
            gamesWon: 0,
            totalScore: 0,
            highestTurnScore: 0,
            hotDiceCount: 0,
            farkleCount: 0,
            consecutiveFarkles: 0,
            singleDieRolls: 0,
            perfectGames: 0,
            comebacks: 0,
            achievements: []
        };
    }

    /**
     * Update player stats
     */
    async updateStats(userId, updates) {
        const user = game.users.get(userId);
        if (!user) return;

        const currentStats = this.getPlayerStats(userId);
        const newStats = foundry.utils.mergeObject(currentStats, updates);

        await user.setFlag(moduleName, 'stats', newStats);

        // Check for new achievements
        this.checkAchievements(userId, newStats);
    }

    /**
     * Check if player unlocked any new achievements
     */
    async checkAchievements(userId, stats) {
        const unlockedAchievements = stats.achievements || [];

        for (const [key, achievement] of Object.entries(ACHIEVEMENTS)) {
            // Skip if already unlocked
            if (unlockedAchievements.includes(achievement.id)) continue;

            // Check if condition is met
            if (achievement.condition(stats)) {
                unlockedAchievements.push(achievement.id);
                await this.unlockAchievement(userId, achievement);
            }
        }

        // Update achievements list
        await game.users.get(userId)?.setFlag(moduleName, 'stats.achievements', unlockedAchievements);
    }

    /**
     * Unlock achievement and show notification
     */
    async unlockAchievement(userId, achievement) {
        console.log(`Farkle | Achievement unlocked for ${userId}:`, achievement.id);

        // Only show notification to the player who unlocked it
        if (game.user.id !== userId) return;

        this.showAchievementNotification(achievement);

        // Play achievement sound
        soundEffects.playAchievement();
    }

    /**
     * Show achievement notification
     */
    showAchievementNotification(achievement) {
        // Check if notifications are enabled
        try {
            const notificationsEnabled = game.settings.get(moduleName, "achievementNotifications");
            if (!notificationsEnabled) return;
        } catch (e) {
            // Setting not registered yet, show anyway
        }

        const notification = document.createElement('div');
        notification.className = 'farkle-achievement';
        notification.innerHTML = `
            <div class="farkle-achievement-header">
                <div class="farkle-achievement-icon">${achievement.icon}</div>
                <div>
                    <div class="farkle-achievement-title">${game.i18n.localize('FARKLE.achievementUnlocked')}</div>
                    <div class="farkle-achievement-name">${game.i18n.localize(achievement.name)}</div>
                </div>
            </div>
            <div class="farkle-achievement-description">${game.i18n.localize(achievement.description)}</div>
        `;

        document.body.appendChild(notification);

        // Auto-hide after 5 seconds
        setTimeout(() => {
            notification.classList.add('hiding');
            setTimeout(() => notification.remove(), 500);
        }, 5000);
    }

    /**
     * Increment a stat value
     */
    async incrementStat(userId, statKey, amount = 1) {
        const stats = this.getPlayerStats(userId);
        stats[statKey] = (stats[statKey] || 0) + amount;
        await this.updateStats(userId, stats);
    }

    /**
     * Set a stat value if it's higher than current
     */
    async setMaxStat(userId, statKey, value) {
        const stats = this.getPlayerStats(userId);
        if ((stats[statKey] || 0) < value) {
            stats[statKey] = value;
            await this.updateStats(userId, stats);
        }
    }

    /**
     * Track hot dice event
     */
    async trackHotDice(userId) {
        await this.incrementStat(userId, 'hotDiceCount');
    }

    /**
     * Track farkle event
     */
    async trackFarkle(userId, consecutive = false) {
        await this.incrementStat(userId, 'farkleCount');
        if (consecutive) {
            const stats = this.getPlayerStats(userId);
            stats.consecutiveFarkles = (stats.consecutiveFarkles || 0) + 1;
            await this.updateStats(userId, stats);
        } else {
            // Reset consecutive count
            const stats = this.getPlayerStats(userId);
            stats.consecutiveFarkles = 0;
            await this.updateStats(userId, stats);
        }
    }

    /**
     * Track turn score
     */
    async trackTurnScore(userId, score) {
        await this.setMaxStat(userId, 'highestTurnScore', score);
    }

    /**
     * Track game end
     */
    async trackGameEnd(userId, won, score) {
        await this.incrementStat(userId, 'gamesPlayed');
        if (won) {
            await this.incrementStat(userId, 'gamesWon');
        }
        await this.incrementStat(userId, 'totalScore', score);
    }
}

// Export singleton instance
export const achievementManager = new AchievementManager();
