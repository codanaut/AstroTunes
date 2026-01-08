<script>
    import { onMount } from "svelte";
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";
    import { searchSongs, starTrack, unstarTrack } from "../../lib/subsonic.js";
    import { playQueue, currentTrack, isPlaying } from "../../lib/player.js";
    import {
        Heart,
        Clock,
        Music,
        ChevronLeft,
        ChevronRight,
        Disc, // Album icon
    } from "lucide-svelte";

    /** @type {any[]} */
    let songs = [];
    let loading = true;
    let totalSongs = 0;
    const limit = 50;

    $: currentPage = Number($page.url.searchParams.get("page")) || 1;
    $: offset = (currentPage - 1) * limit;

    async function loadSongs() {
        loading = true;
        try {
            // Revert to empty query as wildcard fails on some servers
            const result = await searchSongs("", offset, limit);
            if (result && result.searchResult3) {
                if (result.searchResult3.song) {
                    songs = result.searchResult3.song;
                } else {
                    songs = [];
                }
                // Update total songs count
                if (result.searchResult3.totalHits !== undefined) {
                    totalSongs = result.searchResult3.totalHits;
                }
            } else {
                songs = [];
            }
        } catch (e) {
            console.error("Error loading songs:", e);
        } finally {
            loading = false;
        }
    }

    $: if (currentPage) {
        loadSongs();
    }

    /**
     * Toggle starred status for a song
     * @param {any} song
     * @param {Event} event
     */
    async function toggleSongFavorite(song, event) {
        event.stopPropagation();
        const isStarred = !!song.starred;
        try {
            if (isStarred) {
                await unstarTrack(song.id);
                song.starred = undefined;
            } else {
                await starTrack(song.id);
                song.starred = new Date().toISOString();
            }
            songs = songs; // Force update
        } catch (error) {
            console.error("Failed to toggle song favorite:", error);
        }
    }

    /** @param {number} index */
    function playSong(index) {
        if (songs.length > 0) {
            playQueue(songs, index, {
                type: "songs",
                id: "all",
                name: "All Songs",
            });
        }
    }

    /** @param {number} seconds */
    function formatDuration(seconds) {
        const min = Math.floor(seconds / 60);
        const sec = seconds % 60;
        return `${min}:${sec.toString().padStart(2, "0")}`;
    }

    function nextPage() {
        goto(`/songs?page=${currentPage + 1}`);
    }

    function prevPage() {
        if (currentPage > 1) {
            goto(`/songs?page=${currentPage - 1}`);
        }
    }
</script>

<div class="container mx-auto p-6 pb-24">
    <div
        class="flex flex-col md:flex-row items-center justify-between mb-6 gap-4"
    >
        <h1 class="text-3xl font-bold text-[var(--accent)]">Songs</h1>
        <div class="flex gap-2 items-center">
            <button
                on:click={prevPage}
                disabled={currentPage === 1}
                class="p-2 rounded-full bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                <ChevronLeft size={20} />
            </button>
            <span
                class="text-sm text-gray-400 whitespace-nowrap hidden sm:inline"
            >
                {#if totalSongs > 0}
                    {offset + 1}-{Math.min(offset + limit, totalSongs)} of {totalSongs}
                {:else}
                    Page {currentPage}
                {/if}
            </span>
            <button
                on:click={nextPage}
                disabled={songs.length < limit}
                class="p-2 rounded-full bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                <ChevronRight size={20} />
            </button>
        </div>
    </div>

    {#if loading}
        <div class="flex justify-center items-center h-64">
            <div
                class="animate-spin rounded-full h-8 w-8 border-b-2 border-white"
            ></div>
        </div>
    {:else if songs.length === 0}
        <div class="text-center text-gray-500 py-12">No songs found.</div>
    {:else}
        <div class="flex flex-col">
            <!-- Header -->
            <div
                class="grid grid-cols-[auto_1fr_1fr_auto_3rem_auto] gap-4 px-4 py-2 text-sm text-gray-400 border-b border-gray-800 uppercase tracking-wider hidden md:grid"
            >
                <span class="w-8 text-center">#</span>
                <span>Title</span>
                <span>Album</span>
                <span class="w-8"></span>
                <span><Heart size={16} /></span>
                <span class="flex justify-end"><Clock size={16} /></span>
            </div>

            <div class="mt-2">
                {#each songs as song, i}
                    <button
                        on:click={() => playSong(i)}
                        class="w-full grid grid-cols-[auto_1fr_auto_auto] md:grid-cols-[auto_1fr_1fr_auto_3rem_auto] gap-4 px-4 py-3 text-left items-center rounded-md hover:bg-gray-800 group transition-colors
                        {$currentTrack?.id === song.id
                            ? 'text-green-500'
                            : 'text-gray-300'}"
                    >
                        <span
                            class="w-8 text-center text-gray-500 group-hover:text-white"
                        >
                            {#if $currentTrack?.id === song.id && $isPlaying}
                                <div class="flex justify-center">
                                    <Music
                                        size={20}
                                        color="green"
                                        class="animate-pulse"
                                    />
                                </div>
                            {:else}
                                {offset + i + 1}
                            {/if}
                        </span>

                        <!-- Title & Artist -->
                        <div class="flex flex-col">
                            <span
                                class="font-medium truncate {$currentTrack?.id ===
                                song.id
                                    ? 'text-green-500'
                                    : 'text-white'}">{song.title}</span
                            >
                            <span
                                class="text-xs text-gray-500 group-hover:text-gray-400 md:hidden"
                                >{song.artist} • {song.album}</span
                            >
                            <span
                                class="text-xs text-gray-500 group-hover:text-gray-400 hidden md:block"
                                >{song.artist}</span
                            >
                        </div>

                        <!-- Album Column (Hidden on mobile) -->
                        <div
                            class="hidden md:block truncate text-gray-400 group-hover:text-gray-300"
                        >
                            {song.album}
                        </div>

                        <!-- Spacer for alignment matching header if needed, but flex handles it -->
                        <span class="hidden md:block w-8"></span>

                        <!-- Heart -->
                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                        <!-- svelte-ignore a11y_no_static_element_interactions -->
                        <div
                            on:click={(e) => toggleSongFavorite(song, e)}
                            class="w-8 flex justify-center items-center text-gray-500 hover:text-red-500 transition-colors cursor-pointer"
                            title={song.starred ? "Unfavorite" : "Favorite"}
                        >
                            <Heart
                                size={16}
                                class={song.starred
                                    ? "text-red-500 fill-red-500"
                                    : ""}
                            />
                        </div>

                        <!-- Duration -->
                        <span class="text-sm text-gray-500 font-mono text-right"
                            >{formatDuration(song.duration)}</span
                        >
                    </button>
                {/each}
            </div>
        </div>

        <div class="flex justify-center gap-2 mt-8">
            <button
                on:click={prevPage}
                disabled={currentPage === 1}
                class="p-2 rounded-full bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                <ChevronLeft size={20} />
            </button>
            <span class="flex items-center px-2 text-gray-400 text-sm"
                >Page {currentPage} of {Math.ceil(totalSongs / limit) ||
                    1}</span
            >
            <button
                on:click={nextPage}
                disabled={songs.length < limit}
                class="p-2 rounded-full bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                <ChevronRight size={20} />
            </button>
        </div>
    {/if}
</div>
