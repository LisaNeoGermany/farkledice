/**
 * Farkle Sound Effects System
 * Manages sound playback for various game events
 */

import { moduleName } from "./utils.js";

export class SoundEffectsManager {
    constructor() {
        this.sounds = {
            roll: {
                src: CONFIG.sounds.dice,
                volume: 0.5
            },
            keep: {
                src: "sounds/lock.wav",
                volume: 0.3
            },
            farkle: {
                src: "sounds/notify.wav",
                volume: 0.6
            },
            hotDice: {
                src: "sounds/notify.wav",
                volume: 0.5
            },
            achievement: {
                src: "sounds/notify.wav",
                volume: 0.5
            },
            winner: {
                src: "sounds/notify.wav",
                volume: 0.7
            },
            endTurn: {
                src: "sounds/lock.wav",
                volume: 0.4
            }
        };
    }

    /**
     * Check if sound effects are enabled
     */
    isEnabled() {
        try {
            return game.settings.get(moduleName, "soundEffects");
        } catch (e) {
            // Setting not registered yet, default to true
            return true;
        }
    }

    /**
     * Play a sound effect
     * @param {string} soundKey - Key of the sound to play from this.sounds
     * @param {object} options - Optional AudioHelper.play options override
     */
    async play(soundKey, options = {}) {
        if (!this.isEnabled()) return;

        const sound = this.sounds[soundKey];
        if (!sound) {
            console.warn(`Farkle | Sound effect '${soundKey}' not found`);
            return;
        }

        try {
            await foundry.audio.AudioHelper.play({
                src: sound.src,
                volume: sound.volume,
                autoplay: true,
                loop: false,
                ...options
            }, false);
        } catch (error) {
            console.warn(`Farkle | Error playing sound '${soundKey}':`, error);
        }
    }

    /**
     * Play roll sound
     */
    async playRoll() {
        await this.play('roll');
    }

    /**
     * Play keep die sound
     */
    async playKeep() {
        await this.play('keep');
    }

    /**
     * Play farkle sound
     */
    async playFarkle() {
        await this.play('farkle');
    }

    /**
     * Play hot dice sound
     */
    async playHotDice() {
        await this.play('hotDice');
    }

    /**
     * Play achievement unlocked sound
     */
    async playAchievement() {
        await this.play('achievement');
    }

    /**
     * Play winner sound
     */
    async playWinner() {
        await this.play('winner');
    }

    /**
     * Play end turn sound
     */
    async playEndTurn() {
        await this.play('endTurn');
    }

    /**
     * Register custom sounds (for module developers)
     * @param {string} key - Sound key identifier
     * @param {string} src - Sound file path
     * @param {number} volume - Volume level (0-1)
     */
    registerSound(key, src, volume = 0.5) {
        this.sounds[key] = { src, volume };
    }

    /**
     * Override an existing sound
     * @param {string} key - Sound key to override
     * @param {string} src - New sound file path
     * @param {number} volume - New volume level
     */
    overrideSound(key, src, volume = null) {
        if (this.sounds[key]) {
            this.sounds[key].src = src;
            if (volume !== null) {
                this.sounds[key].volume = volume;
            }
        } else {
            this.registerSound(key, src, volume || 0.5);
        }
    }
}

// Export singleton instance
export const soundEffects = new SoundEffectsManager();
