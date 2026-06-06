import { writable } from 'svelte/store';
import { browser } from '$app/environment';

/**
 * @typedef {{ id: string, name: string }} MusicFolder
 */

const DEFAULT_STATE = {
    /** @type {MusicFolder[]} */
    folders: [],
    /** @type {string | null} */
    selectedId: null,
    loaded: false,
};

function createLibraryStore() {
    let initialValue = { ...DEFAULT_STATE };

    if (browser) {
        const stored = localStorage.getItem('library_selected_id');
        if (stored) {
            initialValue.selectedId = stored;
        }
    }

    const { subscribe, set, update } = writable(initialValue);

    return {
        subscribe,

        /**
         * Fetch music folders from the server and populate the store.
         * Should be called after auth is confirmed.
         * @param {(endpoint: string, params?: string) => Promise<any>} subsonicFetch
         */
        load: async (subsonicFetch) => {
            try {
                const data = await subsonicFetch('getMusicFolders');
                if (data && data.musicFolders && data.musicFolders.musicFolder) {
                    const raw = data.musicFolders.musicFolder;
                    // Normalize: Subsonic returns either an array or a single object
                    const folders = /** @type {MusicFolder[]} */ (
                        Array.isArray(raw) ? raw : [raw]
                    ).map((/** @type {any} */ f) => ({
                        id: String(f.id),
                        name: f.value ?? f.name ?? `Library ${f.id}`,
                    }));

                    update(state => {
                        // Validate that persisted selectedId actually exists in user's folders
                        const validId = state.selectedId && folders.some(f => f.id === state.selectedId)
                            ? state.selectedId
                            : null;

                        if (browser && validId !== state.selectedId) {
                            // Clear invalid persisted selection
                            if (validId === null) {
                                localStorage.removeItem('library_selected_id');
                            }
                        }

                        return { folders, selectedId: validId, loaded: true };
                    });
                } else {
                    update(state => ({ ...state, folders: [], loaded: true }));
                }
            } catch (e) {
                console.error('LibraryStore: Failed to load music folders', e);
                update(state => ({ ...state, loaded: true }));
            }
        },

        /**
         * Select a library by ID. Pass null to select all libraries.
         * @param {string | null} id
         */
        select: (id) => {
            update(state => ({ ...state, selectedId: id }));
            if (browser) {
                if (id !== null) {
                    localStorage.setItem('library_selected_id', id);
                } else {
                    localStorage.removeItem('library_selected_id');
                }
            }
        },

        /** Reset store (e.g. on logout) */
        reset: () => {
            if (browser) {
                localStorage.removeItem('library_selected_id');
            }
            set(DEFAULT_STATE);
        },
    };
}

export const libraryStore = createLibraryStore();

/**
 * Helper: returns a `&musicFolderId=<id>` param string, or '' if none selected.
 * Import and use this in pages that support musicFolderId filtering.
 * @param {string | null} selectedId
 * @returns {string}
 */
export function musicFolderParam(selectedId) {
    return selectedId ? `&musicFolderId=${encodeURIComponent(selectedId)}` : '';
}
