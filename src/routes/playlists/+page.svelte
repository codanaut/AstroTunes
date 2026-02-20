<script>
    import { onMount } from "svelte";
    import { getPlaylists, getPlaylist, deletePlaylist } from "$lib/subsonic";
    import { playQueue } from "$lib/player";
    import SongList from "$lib/components/SongList.svelte";
    import CreatePlaylistModal from "$lib/components/CreatePlaylistModal.svelte";
    import {
        ListMusic,
        Loader2,
        Play,
        Shuffle,
        ChevronLeft,
        Plus,
        Trash2,
    } from "lucide-svelte";
    import { fade } from "svelte/transition";
    import { formatDuration } from "$lib/utils/formatDuration.js";

    /** @type {any[]} */
    let playlists = [];
    /** @type {any} */
    let selectedPlaylist = null;
    /** @type {any[]} */
    let selectedPlaylistSongs = [];
    let loading = true;
    let loadingSongs = false;
    let showCreateModal = false;

    import { page } from "$app/stores";

    onMount(async () => {
        await loadPlaylists();
    });

    async function loadPlaylists() {
        loading = true;
        try {
            const res = await getPlaylists();
            if (res && res.playlists && res.playlists.playlist) {
                /** @type {any[]} */
                const rawPlaylists = res.playlists.playlist;

                // Sort by 'created' date descending (newest first)
                playlists = rawPlaylists.sort((a, b) => {
                    const dateB = b.created ? new Date(b.created).getTime() : 0;
                    const dateA = a.created ? new Date(a.created).getTime() : 0;
                    return dateB - dateA;
                });

                // Re-select playlist if one was selected (to update song count etc)
                if (selectedPlaylist) {
                    const found = playlists.find(
                        (p) => p.id === selectedPlaylist.id,
                    );
                    if (found) {
                        selectedPlaylist = found;
                    }
                } else {
                    const playlistId = $page.url.searchParams.get("id");
                    if (playlistId) {
                        const found = playlists.find(
                            (p) => p.id === playlistId,
                        );
                        if (found) {
                            selectPlaylist(found);
                        }
                    }
                }
            } else {
                playlists = [];
            }
        } catch (error) {
            console.error("Failed to load playlists", error);
        } finally {
            loading = false;
        }
    }

    /** @param {any} playlist */
    async function selectPlaylist(playlist) {
        selectedPlaylist = playlist;
        loadingSongs = true;
        selectedPlaylistSongs = [];

        try {
            const res = await getPlaylist(playlist.id);
            if (res && res.playlist && res.playlist.entry) {
                selectedPlaylistSongs = res.playlist.entry;
            } else {
                selectedPlaylistSongs = [];
            }
        } catch (error) {
            console.error("Failed to load playlist songs", error);
        } finally {
            loadingSongs = false;
        }
    }

    function deselectPlaylist() {
        selectedPlaylist = null;
        selectedPlaylistSongs = [];
    }

    /** @param {number} num */
    function formatNumber(num) {
        return num ? num.toLocaleString() : "0";
    }

    function handlePlay() {
        if (selectedPlaylistSongs.length > 0) {
            playQueue(selectedPlaylistSongs, 0, {
                type: "playlist",
                id: selectedPlaylist.id,
                name: selectedPlaylist.name,
            });
        }
    }

    function handleShuffle() {
        if (selectedPlaylistSongs.length > 0) {
            // Create a copy to shuffle
            const shuffled = [...selectedPlaylistSongs].sort(
                () => Math.random() - 0.5,
            );
            playQueue(shuffled, 0, {
                type: "playlist",
                id: selectedPlaylist.id,
                name: selectedPlaylist.name,
            });
        }
    }

    async function handleDelete() {
        if (
            !confirm(
                `Are you sure you want to delete playlist "${selectedPlaylist.name}"?`,
            )
        ) {
            return;
        }

        try {
            await deletePlaylist(selectedPlaylist.id);
            playlists = playlists.filter((p) => p.id !== selectedPlaylist.id);
            deselectPlaylist();
        } catch (error) {
            console.error("Failed to delete playlist", error);
            alert("Failed to delete playlist");
        }
    }

    function handleCreateSuccess() {
        loadPlaylists();
        showCreateModal = false;
    }
</script>

<CreatePlaylistModal
    isOpen={showCreateModal}
    onclose={() => (showCreateModal = false)}
    onsuccess={handleCreateSuccess}
/>

<div class="h-[calc(100%+6rem)] -m-4 md:-m-8 flex overflow-hidden">
    <!-- Playlist Sidebar -->
    <!-- Hidden on mobile if playlist is selected, visible on desktop always -->
    <div
        class="w-full md:w-80 border-r border-[var(--border-primary)] bg-[var(--bg-sidebar)] flex-shrink-0 flex flex-col {selectedPlaylist
            ? 'hidden md:flex'
            : 'flex'}"
    >
        <div
            class="p-4 border-b border-[var(--border-primary)] flex justify-between items-center bg-[var(--bg-sidebar)] z-10"
        >
            <h2
                class="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2"
            >
                <ListMusic class="text-[var(--accent)]" />
                Playlists
            </h2>
            <button
                class="p-2 rounded-full hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                onclick={() => (showCreateModal = true)}
                title="Create New Playlist"
            >
                <Plus size={20} />
            </button>
        </div>

        <div
            class="flex-1 overflow-y-auto p-2 pb-36 scrollbar-thin scrollbar-thumb-[var(--border-secondary)]"
        >
            {#if loading}
                <div class="flex justify-center p-4">
                    <Loader2 class="animate-spin text-green-500" />
                </div>
            {:else if playlists.length === 0}
                <div class="text-gray-500 text-center p-4">
                    No playlists found.
                </div>
            {:else}
                <div class="flex flex-col gap-1">
                    {#each playlists as playlist}
                        <button
                            class="text-left px-4 py-3 rounded-lg hover:bg-[var(--bg-hover)] transition-colors group {selectedPlaylist?.id ===
                            playlist.id
                                ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                                : 'text-[var(--text-secondary)]'}"
                            onclick={() => selectPlaylist(playlist)}
                        >
                            <div
                                class="font-medium truncate group-hover:text-[var(--text-primary)] transition-colors"
                            >
                                {playlist.name}
                            </div>
                            <div
                                class="text-xs text-[var(--text-muted)] mt-1 flex justify-between"
                            >
                                <span
                                    >{formatNumber(playlist.songCount)} songs</span
                                >
                                <span>{formatDuration(playlist.duration)}</span>
                            </div>
                        </button>
                    {/each}
                </div>
            {/if}
        </div>
    </div>

    <!-- Main Content -->
    <!-- Hidden on mobile if NO playlist is selected, visible on desktop always -->
    <!-- CHANGED: flex-col to block, remove overflow-hidden from here and put overflow-y-auto back on this container so the whole thing scrolls -->
    <div
        class="flex-1 overflow-y-auto bg-[var(--bg-main)] scrollbar-thin scrollbar-thumb-[var(--border-secondary)] pb-36 {selectedPlaylist
            ? 'block'
            : 'hidden md:block'}"
    >
        {#if selectedPlaylist}
            <!-- Playlist Header -->
            <!-- Back button is now sticky on mobile so it doesn't get lost -->
            <div
                class="md:hidden sticky top-0 z-20 bg-[var(--bg-main)]/95 backdrop-blur-md p-4 border-b border-[var(--border-primary)] flex items-center gap-4"
            >
                <button
                    class="p-2 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-full text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                    onclick={deselectPlaylist}
                    aria-label="Back to Playlists"
                >
                    <ChevronLeft size={24} />
                </button>
                <div class="font-bold text-lg truncate flex-1">
                    {selectedPlaylist.name}
                </div>
            </div>

            <div
                class="p-4 md:p-8 flex flex-col md:flex-row md:items-end gap-6 bg-[var(--bg-main)] relative border-b border-[var(--border-primary)]"
            >
                <div
                    class="w-40 h-40 md:w-56 md:h-56 shadow-2xl rounded-lg bg-[var(--bg-card)] flex items-center justify-center flex-shrink-0 mx-auto md:mx-0 mt-4 md:mt-0"
                >
                    <ListMusic size={80} class="text-[var(--text-muted)]" />
                </div>

                <div
                    class="flex flex-col gap-4 overflow-hidden flex-1 items-center md:items-start text-center md:text-left w-full"
                >
                    <div class="flex flex-col w-full">
                        <span
                            class="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] hidden md:block"
                            >Playlist</span
                        >
                        <h1
                            class="text-2xl md:text-5xl font-bold text-[var(--text-primary)] truncate drop-shadow-sm leading-tight hidden md:block"
                        >
                            {selectedPlaylist.name}
                        </h1>
                        <!-- Mobile Title (shown only in header body if not scrolled, but we have sticky header now, so maybe acceptable to duplicate or just show here too) -->
                        <h1
                            class="text-2xl font-bold text-[var(--text-primary)] truncate drop-shadow-sm leading-tight md:hidden"
                        >
                            {selectedPlaylist.name}
                        </h1>

                        <div
                            class="flex flex-wrap items-center justify-center md:justify-start gap-x-2 gap-y-1 text-sm text-[var(--text-secondary)] mt-2"
                        >
                            <span class="text-[var(--text-primary)] font-medium"
                                >{selectedPlaylist.owner ||
                                    "Unknown User"}</span
                            >
                            <span class="hidden md:inline">•</span>
                            <span
                                >{formatNumber(selectedPlaylist.songCount)} songs</span
                            >
                            <span class="hidden md:inline">•</span>
                            <span
                                >{formatDuration(
                                    selectedPlaylist.duration,
                                )}</span
                            >
                        </div>
                    </div>

                    <div class="flex items-center gap-3 mt-2">
                        <button
                            class="bg-[var(--accent)] text-[var(--accent-fg)] rounded-full p-3 md:p-4 hover:scale-105 transition-transform shadow-lg hover:opacity-90 flex items-center justify-center"
                            onclick={handlePlay}
                            title="Play Playlist"
                        >
                            <Play size={24} class="fill-current ml-1" />
                        </button>
                        <button
                            class="bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-primary)] rounded-full p-3 md:p-4 hover:scale-105 transition-transform hover:bg-[var(--bg-hover)] flex items-center justify-center"
                            onclick={handleShuffle}
                            title="Shuffle Playlist"
                        >
                            <Shuffle size={24} />
                        </button>
                        <div class="flex-1 md:hidden"></div>
                        <button
                            class="bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-primary)] rounded-full p-3 md:p-4 hover:scale-105 transition-transform hover:bg-[var(--bg-hover)] hover:text-red-500 hover:border-red-500 flex items-center justify-center"
                            onclick={handleDelete}
                            title="Delete Playlist"
                        >
                            <Trash2 size={24} />
                        </button>
                    </div>
                </div>
            </div>

            <!-- Song List -->
            <!-- Removed overflow-y-auto here so it flows naturally -->
            <div>
                {#if loadingSongs}
                    <div class="h-40 flex items-center justify-center">
                        <Loader2
                            class="animate-spin text-[var(--accent)]"
                            size={32}
                        />
                    </div>
                {:else if selectedPlaylistSongs.length === 0}
                    <div class="p-8 text-gray-500 text-center">
                        This playlist is empty.
                    </div>
                {:else}
                    <SongList
                        songs={selectedPlaylistSongs}
                        context="playlist"
                        contextId={selectedPlaylist.id}
                        contextName={selectedPlaylist.name}
                        onplaylistUpdated={() =>
                            selectPlaylist(selectedPlaylist)}
                    />
                {/if}
            </div>
        {:else}
            <!-- Empty State -->
            <div
                class="flex-1 flex flex-col items-center justify-center text-[var(--text-muted)] min-h-[50vh]"
            >
                <ListMusic size={64} class="mb-4 opacity-50" />
                <p class="text-lg">Select a playlist to view songs</p>
                <button
                    class="mt-4 text-[var(--accent)] hover:underline"
                    onclick={() => (showCreateModal = true)}
                >
                    Create New Playlist
                </button>
            </div>
        {/if}
    </div>
</div>
