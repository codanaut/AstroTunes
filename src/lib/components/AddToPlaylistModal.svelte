<script>
    import { createEventDispatcher, onMount } from "svelte";
    import { getPlaylists, createPlaylist, updatePlaylist } from "../subsonic";
    import { X, Loader2, Plus, ListMusic, Check } from "lucide-svelte";
    import { fade, scale } from "svelte/transition";

    export let isOpen = false;
    /** @type {any[]} */
    export let songs = [];

    const dispatch = createEventDispatcher();

    /** @type {any[]} */
    let playlists = [];
    let isLoadingPlaylists = false;
    let isProcessing = false;
    let error = "";
    let searchQuery = "";
    let showCreateInput = false;
    let newPlaylistName = "";

    $: filteredPlaylists = playlists.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    $: if (isOpen) {
        loadPlaylists();
        resetState();
    }

    function resetState() {
        error = "";
        searchQuery = "";
        showCreateInput = false;
        newPlaylistName = "";
        isProcessing = false;
    }

    async function loadPlaylists() {
        isLoadingPlaylists = true;
        try {
            const res = await getPlaylists();
            if (res && res.playlists && res.playlists.playlist) {
                playlists = res.playlists.playlist;
            } else {
                playlists = [];
            }
        } catch (e) {
            console.error("Failed to load playlists", e);
            error = "Failed to load playlists";
        } finally {
            isLoadingPlaylists = false;
        }
    }

    /** @param {any} playlist */
    async function handleAddToPlaylist(playlist) {
        if (isProcessing) return;
        isProcessing = true;
        error = "";

        try {
            const songIds = songs.map((s) => s.id);
            await updatePlaylist(playlist.id, { songIdsToAdd: songIds });
            dispatch("success");
            close();
        } catch (e) {
            console.error("Failed to add to playlist", e);
            error = "Failed to add songs to playlist";
            isProcessing = false;
        }
    }

    async function handleCreateAndAdd() {
        if (!newPlaylistName.trim() || isProcessing) return;
        isProcessing = true;
        error = "";

        try {
            const songIds = songs.map((s) => s.id);
            await createPlaylist(newPlaylistName, songIds);
            dispatch("success");
            close();
        } catch (e) {
            console.error("Failed to create playlist", e);
            error = "Failed to create playlist";
            isProcessing = false;
        }
    }

    function close() {
        isOpen = false;
        dispatch("close");
    }
</script>

{#if isOpen}
    <!-- Backdrop -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        transition:fade={{ duration: 200 }}
        on:click={close}
    >
        <!-- Modal Content -->
        <div
            class="bg-[var(--bg-card)] border border-[var(--border-primary)] w-full max-w-md rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            transition:scale={{ duration: 200, start: 0.95 }}
            on:click|stopPropagation
        >
            <div
                class="p-4 border-b border-[var(--border-primary)] flex justify-between items-center flex-shrink-0"
            >
                <h2 class="text-lg font-bold text-[var(--text-primary)]">
                    Add to Playlist
                </h2>
                <button
                    on:click={close}
                    class="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                    <X size={20} />
                </button>
            </div>

            {#if error}
                <div
                    class="px-4 py-2 bg-red-500/10 text-red-500 text-sm border-b border-red-500/20"
                >
                    {error}
                </div>
            {/if}

            <div
                class="p-2 border-b border-[var(--border-primary)] flex-shrink-0"
            >
                <input
                    type="text"
                    bind:value={searchQuery}
                    placeholder="Search playlists..."
                    class="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
            </div>

            <div class="overflow-y-auto flex-1 p-2">
                {#if showCreateInput}
                    <form
                        on:submit|preventDefault={handleCreateAndAdd}
                        class="flex gap-2 p-2 mb-2 bg-[var(--bg-hover)] rounded-md"
                    >
                        <!-- svelte-ignore a11y_autofocus -->
                        <input
                            type="text"
                            bind:value={newPlaylistName}
                            placeholder="Playlist Name"
                            class="flex-1 bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded px-2 py-1 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                            autoFocus
                        />
                        <button
                            type="submit"
                            disabled={!newPlaylistName.trim() || isProcessing}
                            class="bg-[var(--accent)] text-[var(--accent-fg)] px-3 py-1 rounded text-sm font-medium disabled:opacity-50"
                        >
                            {#if isProcessing}
                                <Loader2 size={14} class="animate-spin" />
                            {:else}
                                Create
                            {/if}
                        </button>
                        <button
                            type="button"
                            on:click={() => (showCreateInput = false)}
                            class="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        >
                            <X size={16} />
                        </button>
                    </form>
                {:else}
                    <button
                        class="w-full text-left px-3 py-3 rounded-md hover:bg-[var(--bg-hover)] flex items-center gap-3 text-[var(--accent)] transition-colors"
                        on:click={() => (showCreateInput = true)}
                    >
                        <div
                            class="w-8 h-8 rounded bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)]"
                        >
                            <Plus size={16} />
                        </div>
                        <span class="font-medium">New Playlist</span>
                    </button>
                {/if}

                {#if isLoadingPlaylists}
                    <div class="flex justify-center p-4">
                        <Loader2 class="animate-spin text-[var(--accent)]" />
                    </div>
                {:else}
                    {#each filteredPlaylists as playlist}
                        <button
                            class="w-full text-left px-3 py-2 rounded-md hover:bg-[var(--bg-hover)] flex items-center gap-3 group transition-colors"
                            on:click={() => handleAddToPlaylist(playlist)}
                            disabled={isProcessing}
                        >
                            <div
                                class="w-8 h-8 rounded bg-[var(--bg-sidebar)] border border-[var(--border-secondary)] flex items-center justify-center text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]"
                            >
                                <ListMusic size={16} />
                            </div>
                            <div class="flex flex-col overflow-hidden">
                                <span
                                    class="font-medium text-[var(--text-primary)] truncate"
                                    >{playlist.name}</span
                                >
                                <span class="text-xs text-[var(--text-muted)]"
                                    >{playlist.songCount} songs</span
                                >
                            </div>
                            <div
                                class="ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                {#if isProcessing}
                                    <Loader2
                                        size={16}
                                        class="animate-spin text-[var(--text-muted)]"
                                    />
                                {/if}
                            </div>
                        </button>
                    {/each}
                {/if}
            </div>

            <div
                class="p-3 border-t border-[var(--border-primary)] text-xs text-center text-[var(--text-muted)] flex-shrink-0"
            >
                Adding {songs.length} song{songs.length !== 1 ? "s" : ""}
            </div>
        </div>
    </div>
{/if}
