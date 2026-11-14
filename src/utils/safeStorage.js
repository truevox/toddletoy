/**
 * safeStorage - localStorage wrapper that never throws.
 *
 * Accessing window.localStorage can itself throw (Safari private mode with
 * storage blocked, cookies disabled, sandboxed webviews). When the real store
 * is unavailable or a call fails we fall back to an in-memory Map so the app
 * keeps working for the rest of the session (nothing persists across reloads).
 */
const memory = new Map();

function getStore() {
    try {
        return globalThis.localStorage || null;
    } catch (error) {
        return null;
    }
}

export const safeStorage = {
    getItem(key) {
        const store = getStore();
        if (store) {
            try {
                const value = store.getItem(key);
                if (value !== null && value !== undefined) return value;
            } catch (error) {
                // fall through to memory
            }
        }
        return memory.has(key) ? memory.get(key) : null;
    },

    setItem(key, value) {
        const text = String(value);
        const store = getStore();
        if (store) {
            try {
                store.setItem(key, text);
                memory.delete(key);
                return true;
            } catch (error) {
                // quota / denied: keep in memory instead
            }
        }
        memory.set(key, text);
        return false;
    },

    removeItem(key) {
        memory.delete(key);
        const store = getStore();
        if (store) {
            try {
                store.removeItem(key);
            } catch (error) {
                // ignore
            }
        }
    }
};
