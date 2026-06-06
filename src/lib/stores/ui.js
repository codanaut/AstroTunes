import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const DEFAULT_STATE = {
    isSidebarCollapsed: false
};

function createUiStore() {
    let initialValue = DEFAULT_STATE;

    if (browser) {
        const stored = localStorage.getItem('ui_state');
        if (stored) {
            try {
                initialValue = { ...DEFAULT_STATE, ...JSON.parse(stored) };
            } catch (e) {
                console.error("Failed to parse UI state", e);
            }
        }
    }

    const { subscribe, update } = writable(initialValue);

    return {
        subscribe,
        toggleSidebar: () => {
            update(current => {
                const updated = { ...current, isSidebarCollapsed: !current.isSidebarCollapsed };
                if (browser) {
                    localStorage.setItem('ui_state', JSON.stringify(updated));
                }
                return updated;
            });
        }
    };
}

export const ui = createUiStore();
