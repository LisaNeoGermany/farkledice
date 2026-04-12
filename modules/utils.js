/**
 * Farkle Dice Game - Utility Functions
 * Foundry VTT V13 Module
 *
 * Core utility functions for the Farkle module
 */

export const moduleName = "farkledice";

/**
 * Get all open applications of a specific type (V13 ApplicationV2 only)
 * @param {Class} cls - The application class to filter by
 * @returns {Array} Array of open applications matching the class
 */
export function getOpenApplicationsOfType(cls) {
    const v2Instances = foundry.applications?.instances ? Array.from(foundry.applications.instances.values()) : [];
    return v2Instances.filter(app => app instanceof cls);
}

/**
 * Resolve the root HTML element from various input formats
 * Handles both HTMLElement and jQuery-like array formats
 * @param {HTMLElement|Array} html - The primary element or array to resolve
 * @param {HTMLElement|Array} fallback - Fallback element if primary fails
 * @returns {HTMLElement|null} The resolved HTML element or null
 */
export function resolveRootElement(html, fallback) {
    if (html instanceof HTMLElement) return html;
    if (html?.[0] instanceof HTMLElement) return html[0];
    if (fallback instanceof HTMLElement) return fallback;
    if (fallback?.[0] instanceof HTMLElement) return fallback[0];
    return null;
}

/**
 * Conditional debug logging based on module settings
 * Only logs when the 'debug' setting is enabled
 * @param {...*} args - Arguments to log to console
 */
export function moduleDebug(...args) {
    try {
        if (game?.settings?.get(moduleName, "debug")) {
            console.log("Farkle Debug |", ...args);
        }
    } catch (err) {
        console.warn("Farkle Debug | Failed to log debug output", err);
    }
}
