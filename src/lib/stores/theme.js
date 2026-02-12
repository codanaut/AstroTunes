import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const DEFAULT_STATE = {
    mode: 'dark',
    accent: 'green',
    trueBlack: false
};

function createThemeStore() {
    let initialValue = DEFAULT_STATE;

    if (browser) {
        const stored = localStorage.getItem('theme_state');
        if (stored) {
            try {
                initialValue = { ...DEFAULT_STATE, ...JSON.parse(stored) };
            } catch (e) {
                console.error("Failed to parse theme state", e);
            }
        }
    }

    const { subscribe, set, update } = writable(initialValue);

    return {
        subscribe,
        /**
         * @param {Partial<typeof DEFAULT_STATE>} newState
         */
        set: (newState) => {
            update(current => {
                const updated = { ...current, ...newState };
                if (browser) {
                    localStorage.setItem('theme_state', JSON.stringify(updated));
                    applyTheme(updated);
                }
                return updated;
            });
        },
        reset: () => {
            set(DEFAULT_STATE);
            if (browser) {
                localStorage.setItem('theme_state', JSON.stringify(DEFAULT_STATE));
                applyTheme(DEFAULT_STATE);
            }
        },
        /**
         * Update a single property
         * @param {keyof typeof DEFAULT_STATE} key
         * @param {any} value
         */
        updateProperty: (key, value) => {
            update(current => {
                const updated = { ...current, [key]: value };
                if (browser) {
                    localStorage.setItem('theme_state', JSON.stringify(updated));
                    applyTheme(updated);
                }
                return updated;
            });
        }
    };
}

/* src/lib/stores/theme.js */

/**
 * @param {typeof DEFAULT_STATE} state
 */
function applyTheme(state) {
    const root = document.documentElement;
    root.setAttribute('data-mode', state.mode);

    // Check if accent is a Hex Color (e.g. #ff0000) or a Preset Name (e.g. 'green')
    if (state.accent.startsWith('#')) {
        // It's a custom color! Set the variable directly.
        root.style.setProperty('--accent', state.accent);
        root.setAttribute('data-accent', 'custom');
    } else {
        // It's a preset. Remove inline style so CSS classes take over.
        root.style.removeProperty('--accent');
        root.setAttribute('data-accent', state.accent);
    }

    root.setAttribute('data-true-black', String(state.trueBlack));
}

export const theme = createThemeStore();

// Initialize on load
if (browser) {
    const stored = localStorage.getItem('theme_state');
    const state = stored ? { ...DEFAULT_STATE, ...JSON.parse(stored) } : DEFAULT_STATE;
    applyTheme(state);
}
