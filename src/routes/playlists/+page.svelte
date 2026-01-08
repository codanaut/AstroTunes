<script>
    import { onMount } from "svelte";
    import { getPlaylists, getPlaylist } from "$lib/subsonic";
    import { playQueue } from "$lib/player";
    import SongList from "$lib/components/SongList.svelte";
    import {
        ListMusic,
        Loader2,
        Play,
        Shuffle,
        ChevronLeft,
    } from "lucide-svelte";
    import { fade } from "svelte/transition";

    /** @type {any[]} */
    let playlists = [];
    /** @type {any} */
    let selectedPlaylist = null;
    /** @type {any[]} */
    let selectedPlaylistSongs = [];
    let loading = true;
    let loadingSongs = false;

    import { page } from "$app/stores";

    onMount(async () => {
        try {
            const res = await getPlaylists();
            if (res && res.playlists && res.playlists.playlist) {
                playlists = res.playlists.playlist;

                const playlistId = $page.url.searchParams.get("id");
                if (playlistId) {
                    const found = playlists.find((p) => p.id === playlistId);
                    if (found) {
                        selectPlaylist(found);
                    }
                }
            }
        } catch (error) {
            console.error("Failed to load playlists", error);
        } finally {
            loading = false;
        }
    });

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

    /** @param {number} seconds */
    function formatDuration(seconds) {
        if (!seconds) return "0 min";
        const minutes = Math.floor(seconds / 60);

        if (minutes < 60) {
            return `${minutes} min`;
        }

        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;

        if (hours < 24) {
            return `${hours} hr ${remainingMinutes} min`;
        }

        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;
        return `${days} days ${remainingHours} hr`;
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
</script>

<div class="h-full flex overflow-hidden">
    <!-- Playlist Sidebar -->
    <!-- Hidden on mobile if playlist is selected, visible on desktop always -->
    <div
        class="w-full md:w-80 border-r border-[var(--border-primary)] bg-[var(--bg-sidebar)] flex-shrink-0 flex flex-col {selectedPlaylist
            ? 'hidden md:flex'
            : 'flex'}"
    >
        <div class="p-4 border-b border-[var(--border-primary)]">
            <h2
                class="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2"
            >
                <ListMusic class="text-[var(--accent)]" />
                Playlists
            </h2>
        </div>

        <div
            class="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-[var(--border-secondary)]"
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
                            on:click={() => selectPlaylist(playlist)}
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
    <div
        class="flex-1 overflow-hidden flex-col bg-[var(--bg-main)] {selectedPlaylist
            ? 'flex'
            : 'hidden md:flex'}"
    >
        {#if selectedPlaylist}
            <!-- Playlist Header -->
            <div
                class="p-6 md:p-8 flex flex-col md:flex-row md:items-end gap-6 bg-[var(--bg-main)] relative border-b border-[var(--border-primary)]"
            >
                <!-- Back Button (Mobile Only) -->
                <button
                    class="md:hidden absolute top-4 left-4 p-2 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-full text-[var(--text-primary)]"
                    on:click={deselectPlaylist}
                >
                    <ChevronLeft size={24} />
                </button>

                <div
                    class="w-32 h-32 md:w-48 md:h-48 shadow-2xl rounded-md bg-[var(--bg-card)] flex items-center justify-center flex-shrink-0 mx-auto md:mx-0 mt-8 md:mt-0"
                >
                    <ListMusic size={64} class="text-[var(--text-muted)]" />
                </div>
                <div
                    class="flex flex-col gap-4 mb-2 overflow-hidden flex-1 items-center md:items-start text-center md:text-left"
                >
                    <div class="flex flex-col w-full">
                        <span
                            class="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] hidden md:block"
                            >Playlist</span
                        >
                        <h1
                            class="text-2xl md:text-5xl font-bold text-[var(--text-primary)] truncate drop-shadow-sm"
                        >
                            {selectedPlaylist.name}
                        </h1>
                        <div
                            class="flex items-center justify-center md:justify-start gap-2 text-sm text-[var(--text-secondary)] mt-2"
                        >
                            <span class="text-[var(--text-primary)] font-medium"
                                >{selectedPlaylist.owner ||
                                    "Unknown User"}</span
                            >
                            <span
                                >• {formatNumber(selectedPlaylist.songCount)} songs</span
                            >
                            <span
                                >• {formatDuration(
                                    selectedPlaylist.duration,
                                )}</span
                            >
                        </div>
                    </div>

                    <div class="flex items-center gap-3">
                        <button
                            class="bg-[var(--accent)] text-[var(--accent-fg)] rounded-full p-3 hover:scale-105 transition-transform shadow-lg hover:opacity-90"
                            on:click={handlePlay}
                            title="Play Playlist"
                        >
                            <Play size={24} class="fill-current ml-1" />
                        </button>
                        <button
                            class="bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-primary)] rounded-full p-3 hover:scale-105 transition-transform hover:bg-[var(--bg-hover)]"
                            on:click={handleShuffle}
                            title="Shuffle Playlist"
                        >
                            <Shuffle size={24} />
                        </button>
                    </div>
                </div>
            </div>

            <!-- Song List -->
            <div class="flex-1 overflow-y-auto">
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
                    />
                {/if}
            </div>
        {:else}
            <!-- Empty State -->
            <div
                class="flex-1 flex flex-col items-center justify-center text-[var(--text-muted)]"
            >
                <ListMusic size={64} class="mb-4 opacity-50" />
                <p class="text-lg">Select a playlist to view songs</p>
            </div>
        {/if}
    </div>
</div>
