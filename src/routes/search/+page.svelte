<script>
    import { page } from "$app/stores";
    import { search, getCoverArtUrl } from "../../lib/subsonic.js";
    import { playQueue, currentTrack, isPlaying } from "../../lib/player.js";
    import { Music } from "lucide-svelte";

    /**
     * @typedef {Object} SearchResult
     * @property {any[]} [artist]
     * @property {any[]} [album]
     * @property {any[]} [song]
     */

    let query = $state("");
    /** @type {SearchResult | null} */
    let results = $state(null);
    let loading = $state(false);

    /**
     * @param {string} q
     */
    async function performSearch(q) {
        loading = true;
        try {
            const data = await search(q);
            if (data && data.searchResult3) {
                results = data.searchResult3;
            } else {
                results = { artist: [], album: [], song: [] };
            }
        } catch (e) {
            console.error("Search error:", e);
        } finally {
            loading = false;
        }
    }

    // Effect to react to URL changes
    $effect(() => {
        const q = $page.url.searchParams.get("q");
        if (q && q !== query) {
            query = q;
            performSearch(query);
        } else if (!q) {
            query = "";
            results = null;
        }
    });

    /**
     * @param {any} song
     */
    function playSong(song) {
        if (results && results.song) {
            const index = results.song.findIndex(
                (/** @type {{ id: any; }} */ s) => s.id === song.id,
            );
            playQueue(results.song, index, {
                type: "search",
                id: query,
                name: `Search: ${query}`,
            });
        }
    }

    /**
     * @param {number} seconds
     */
    function formatDuration(seconds) {
        const min = Math.floor(seconds / 60);
        const sec = seconds % 60;
        return `${min}:${sec.toString().padStart(2, "0")}`;
    }

    /**
     * @param {Event} e
     */
    function handleImageError(e) {
        const target = /** @type {HTMLImageElement} */ (e.currentTarget);
        if (target) {
            target.src = "/placeholder_artist.png";
        }
    }
</script>

<div class="container mx-auto pb-24 px-6 pt-4">
    <h1 class="text-3xl font-bold mb-8">Search Results for "{query}"</h1>

    {#if loading}
        <div class="flex justify-center items-center h-64">
            <div
                class="animate-spin rounded-full h-8 w-8 border-b-2 border-white"
            ></div>
        </div>
    {:else if results}
        <!-- ARTISTS -->
        {#if results.artist && results.artist.length > 0}
            <section class="mb-12">
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-2xl font-bold text-white">Artists</h2>
                </div>
                <div
                    class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4"
                >
                    {#each results.artist as artist}
                        <a href="/artist/{artist.id}" class="group block">
                            <div
                                class="relative aspect-square mb-2 overflow-hidden rounded-full bg-gray-800"
                            >
                                <img
                                    src={getCoverArtUrl(artist.id)}
                                    alt={artist.name}
                                    class="object-cover w-full h-full transform group-hover:scale-105 transition-transform duration-300"
                                    onerror={handleImageError}
                                />
                            </div>
                            <div
                                class="font-medium text-center truncate text-white group-hover:text-green-400 transition-colors"
                            >
                                {artist.name}
                            </div>
                        </a>
                    {/each}
                </div>
            </section>
        {/if}

        <!-- ALBUMS -->
        {#if results.album && results.album.length > 0}
            <section class="mb-12">
                <h2 class="text-2xl font-bold mb-4 text-white">Albums</h2>
                <div
                    class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4"
                >
                    {#each results.album as album}
                        <a
                            href="/album/{album.id}"
                            class="text-left group block"
                        >
                            <div
                                class="relative aspect-square mb-2 overflow-hidden rounded-lg bg-gray-800"
                            >
                                <img
                                    src={getCoverArtUrl(album.id)}
                                    alt={album.title}
                                    class="object-cover w-full h-full transform group-hover:scale-105 transition-transform duration-300"
                                    loading="lazy"
                                />
                            </div>
                            <div
                                class="font-medium truncate text-white group-hover:text-green-400 transition-colors"
                            >
                                {album.title}
                            </div>
                            <div class="text-sm text-gray-500 truncate">
                                {album.artist}
                            </div>
                        </a>
                    {/each}
                </div>
            </section>
        {/if}

        <!-- SONGS -->
        {#if results.song && results.song.length > 0}
            <section class="mb-12">
                <h2 class="text-2xl font-bold mb-4 text-white">Songs</h2>
                <div class="flex flex-col">
                    {#each results.song as song}
                        <button
                            onclick={() => playSong(song)}
                            class="w-full grid grid-cols-[auto_1fr_auto_auto] gap-4 px-4 py-3 text-left items-center rounded-md hover:bg-gray-800 group transition-colors
                             {$currentTrack?.id === song.id
                                ? 'bg-gray-800/50'
                                : ''}"
                        >
                            <span
                                class="w-8 text-center text-gray-500 group-hover:text-white"
                            >
                                {#if $currentTrack?.id === song.id && $isPlaying}
                                    <div class="flex justify-center">
                                        <Music
                                            size={16}
                                            class="text-green-500 animate-pulse"
                                        />
                                    </div>
                                {:else}
                                    <Music size={16} />
                                {/if}
                            </span>
                            <div class="flex flex-col min-w-0">
                                <span
                                    class="font-medium truncate {$currentTrack?.id ===
                                    song.id
                                        ? 'text-green-500'
                                        : 'text-white'}"
                                >
                                    {song.title}
                                </span>
                                <span
                                    class="text-xs text-gray-500 truncate flex gap-1"
                                >
                                    <span class="text-gray-400"
                                        >{song.artist}</span
                                    >
                                    <span>•</span>
                                    <span>{song.album}</span>
                                </span>
                            </div>
                            <span class="text-sm text-gray-500 font-mono">
                                {formatDuration(song.duration)}
                            </span>
                        </button>
                    {/each}
                </div>
            </section>
        {/if}

        {#if (!results.artist || results.artist.length === 0) && (!results.album || results.album.length === 0) && (!results.song || results.song.length === 0)}
            <div class="text-center text-gray-400 mt-12 text-lg">
                No results found for "{query}"
            </div>
        {/if}
    {/if}
</div>
