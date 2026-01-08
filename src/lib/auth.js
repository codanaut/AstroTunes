
import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
// @ts-ignore - Ignores missing type definitions for blueimp-md5
import md5 from 'blueimp-md5';

// Initial state
const initialState = {
    serverUrl: '',
    username: '',
    password: '',
    isConnected: false
};

// Create the store
function createAuthStore() {
    const { subscribe, set, update } = writable(initialState);

    return {
        subscribe,
        set,
        update,
        // Load from localStorage on init
        load: () => {
            if (browser) {
                const stored = localStorage.getItem('subsonic_auth');
                if (stored) {
                    try {
                        const parsed = JSON.parse(stored);
                        set({ ...parsed, isConnected: false }); // Start as disconnected until verified
                    } catch (e) {
                        console.error('Failed to parse auth config', e);
                    }
                }
            }
        },
        /**
         * Save to localStorage
         * @param {any} config 
         */
        save: (config) => {
            if (browser) {
                // Don't save isConnected state
                const { isConnected, ...toSave } = config;
                localStorage.setItem('subsonic_auth', JSON.stringify(toSave));
            }
            set(config);
        },
        // Clear auth
        logout: () => {
            if (browser) {
                localStorage.removeItem('subsonic_auth');
            }
            set(initialState);
        }
    };
}

export const auth = createAuthStore();

// Initialize
auth.load();
