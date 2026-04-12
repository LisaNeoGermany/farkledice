import { moduleName, moduleDebug } from "./utils.js";

export default class VerwaltungClient {
    static _charactersCache = null;
    static _cacheTime = 0;
    static CACHE_TTL = 30000; // 30 seconds

    static get baseUrl() {
        return game.settings.get(moduleName, "apiUrl")?.replace(/\/$/, "") || "http://localhost:5000/api";
    }

    static get apiKey() {
        return game.settings.get(moduleName, "apiKey") || "farkle_secret";
    }

    /**
     * Fetch all characters from the API with caching
     * @returns {Promise<Array|null>}
     */
    static async getCharacters() {
        const now = Date.now();
        if (this._charactersCache && (now - this._cacheTime < this.CACHE_TTL)) {
            return this._charactersCache;
        }

        try {
            const url = `${this.baseUrl}/characters`;
            moduleDebug(`Fetching all characters from ${url}`);
            const response = await fetch(url, {
                headers: {
                    "X-API-KEY": this.apiKey
                }
            });
            
            if (!response.ok) {
                console.error(`Farkle | API Error getCharacters: ${response.status} ${response.statusText}`);
                return this._charactersCache; // Return stale cache on error if available
            }
            
            const data = await response.json();
            
            // Handle different possible response structures
            let characters = null;
            if (Array.isArray(data)) {
                characters = data;
            } else if (data && Array.isArray(data.characters)) {
                characters = data.characters;
            } else if (data && typeof data === 'object') {
                // If it's a single character or some other object, wrap it if it looks like a character
                if (data.id && data.name) characters = [data];
            }

            if (characters) {
                this._charactersCache = characters;
                this._cacheTime = now;
                return characters;
            }
            
            console.error("Farkle | API Error: Unexpected characters response format", data);
            return null;
        } catch (e) {
            console.error("Farkle | API Exception getCharacters:", e);
            return this._charactersCache;
        }
    }

    static async findCharacter(name) {
        if (!name) return null;
        try {
            const characters = await this.getCharacters();
            if (!Array.isArray(characters)) return null;
            
            // Try exact match
            let found = characters.find(c => c.name === name);
            if (!found) {
                // Try case-insensitive
                found = characters.find(c => c.name.toLowerCase() === name.toLowerCase());
            }

            // If found, and we need up-to-date coins, we might want to call getCoins
            // But for now let's just return what we found
            return found || null;
        } catch (e) {
            console.error("Farkle | API Error findCharacter:", e);
            return null;
        }
    }

    static async getCoins(charId) {
        if (!charId) return 0;
        try {
            const url = `${this.baseUrl}/characters/${charId}/coins`;
            moduleDebug(`Fetching coins from ${url}`);
            const response = await fetch(url, {
                headers: {
                    "X-API-KEY": this.apiKey
                }
            });
            if (!response.ok) {
                console.error(`Farkle | Error fetching coins for char ${charId}: ${response.status} ${response.statusText}`);
                return 0;
            }
            const data = await response.json();
            // Handle both { coins: X } and direct number if API differs
            return typeof data.coins !== 'undefined' ? data.coins : (typeof data === 'number' ? data : 0);
        } catch (e) {
            console.error("Farkle | API Error getCoins:", e);
            return 0;
        }
    }

    static async transaction(charId, amount, reason) {
        if (!charId) {
            if (amount !== 0) console.warn(`Farkle | Cannot perform transaction of ${amount} for missing charId`);
            return amount === 0;
        }
        if (amount === 0) return true;

        try {
            const url = `${this.baseUrl}/characters/${charId}/coins/transaction`;
            moduleDebug(`Transaction for char ${charId}: ${amount} coins (${reason})`);
            
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-API-KEY": this.apiKey
                },
                body: JSON.stringify({
                    amount: amount,
                    reason: reason
                })
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                console.error(`Farkle | Transaction failed: ${response.status} ${response.statusText}`, err);
                return false;
            }
            const data = await response.json();
            return data.success === true || data.status === "success";
        } catch (e) {
            console.error("Farkle | API Transaction Exception:", e);
            return false;
        }
    }
}
