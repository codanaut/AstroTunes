<script>
    import { onMount, onDestroy } from "svelte";
    import { subsonicFetch } from "../../lib/subsonic.js";
    import { playQueue, playQueueShuffled } from "../../lib/player.js";
    import { Play, Shuffle, Music, Disc, Mic2 } from "lucide-svelte";
    import ShowAllButton from "../../lib/components/ShowAllButton.svelte";
    import SongList from "../../lib/components/SongList.svelte";
    import AlbumCard from "../../lib/components/AlbumCard.svelte";
    import ArtistCard from "../../lib/components/ArtistCard.svelte";
    import { resolve } from "$app/paths";
    import {
        libraryStore,
        musicFolderParam,
    } from "../../lib/stores/library.js";
    import { untrack } from "svelte";

    /** @type {any[]} */
    let favoriteAlbums = $state([]);
    /** @type {any[]} */
    let favoriteSongs = $state([]);
    /** @type {any[]} */
    let favoriteArtists = $state([]);

    onMount(async () => {
        startSyncLoop();
    });

    onDestroy(() => {
        if (syncInterval) clearInterval(syncInterval);
    });

    /**
     * @param {string} folderParam
     */
    async function loadFavorites(folderParam = "") {
        const starred = await subsonicFetch("getStarred", folderParam);
        if (starred && starred.starred) {
            favoriteAlbums = starred.starred.album ?? [];
            favoriteSongs = starred.starred.song ?? [];
            favoriteArtists = starred.starred.artist ?? [];
        }
    }

    // Re-fetch when library selection changes
    $effect(() => {
        const folderParam = musicFolderParam($libraryStore.selectedId);
        untrack(() => loadFavorites(folderParam));
    });

    /** @type {any} */
    let syncInterval;

    function startSyncLoop() {
        if (syncInterval) clearInterval(syncInterval);
        syncInterval = setInterval(async () => {
            const folderParam = musicFolderParam($libraryStore.selectedId);
            await loadFavorites(folderParam);
        }, 10000);
    }
</script>

<div class="container mx-auto p-2 md:p-8 pb-32">
    <!-- FAVORITE SONGS SECTION -->
    <div
        class="flex flex-col md:flex-row items-center justify-between mt-12 mb-6 gap-4"
    >
        <div class="flex items-center gap-2">
            <h1 class="text-3xl font-bold text-[var(--text-primary)]">
                <a
                    href={resolve("/favorites/songs")}
                    class="hover:text-[var(--accent)] transition-colors"
                    >Favorite Songs</a
                >
            </h1>
            {#if favoriteSongs.length > 0}
                <div class="flex gap-2 ml-4">
                    <button
                        onclick={() =>
                            playQueue(favoriteSongs, 0, {
                                type: "favorites",
                                id: "all",
                                name: "Favorite Songs",
                            })}
                        class="p-2 bg-[var(--accent)] text-[var(--accent-fg)] rounded-full hover:scale-105 transition-all shadow-lg"
                        title="Play All"
                    >
                        <Play size={18} fill="currentColor" class="ml-0.5" />
                    </button>
                    <button
                        onclick={() => playQueueShuffled(favoriteSongs)}
                        class="p-2 bg-[var(--bg-card)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-full hover:bg-[var(--bg-hover)] transition-all shadow-sm"
                        title="Shuffle Play"
                    >
                        <Shuffle size={18} />
                    </button>
                </div>
            {/if}
        </div>
        <div class="ml-auto">
            <ShowAllButton
                href={resolve("/favorites/songs")}
                label="Show All"
            />
        </div>
    </div>

    <div class="flex flex-col mb-12">
        <SongList
            songs={favoriteSongs}
            context="favorites"
            limit={10}
            contextId="all"
            contextName="Favorite Songs"
            showToolbar={false}
        />
    </div>

    <!-- FAVORITE ALBUMS SECTION -->
    <div
        class="flex flex-col md:flex-row items-center justify-between mt-12 mb-6 gap-4"
    >
        <div class="flex items-center gap-2">
            <h1 class="text-3xl font-bold text-[var(--text-primary)]">
                <a
                    href={resolve("/favorites/albums")}
                    class="hover:text-[var(--accent)] transition-colors"
                    >Favorite Albums</a
                >
            </h1>
            {#if favoriteAlbums.length > 0}
                <span
                    class="text-[var(--text-muted)] text-sm font-normal self-end mb-1 ml-2"
                >
                    {favoriteAlbums.length} albums
                </span>
            {/if}
        </div>
        <div class="ml-auto">
            <ShowAllButton
                href={resolve("/favorites/albums")}
                label="Show All"
            />
        </div>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 mb-12">
        {#each favoriteAlbums.slice(0, 10) as album (album.id)}
            <AlbumCard {album} />
        {/each}
        {#if favoriteAlbums.length === 0}
            <div
                class="col-span-full text-center py-10 text-[var(--text-secondary)]"
            >
                No favorite albums found.
            </div>
        {/if}
    </div>

    <!-- FAVORITE ARTISTS SECTION -->
    <div
        class="flex flex-col md:flex-row items-center justify-between mt-12 mb-6 gap-4"
    >
        <div class="flex items-center gap-2">
            <h1 class="text-3xl font-bold text-[var(--text-primary)]">
                <a
                    href={resolve("/favorites/artists")}
                    class="hover:text-[var(--accent)] transition-colors"
                    >Favorite Artists</a
                >
            </h1>
            {#if favoriteArtists.length > 0}
                <span
                    class="text-[var(--text-muted)] text-sm font-normal self-end mb-1 ml-2"
                >
                    {favoriteArtists.length} artists
                </span>
            {/if}
        </div>
        <div class="ml-auto">
            <ShowAllButton
                href={resolve("/favorites/artists")}
                label="Show All"
            />
        </div>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {#each favoriteArtists.slice(0, 10) as artist, i (artist.id)}
            <ArtistCard bind:artist={favoriteArtists[i]} />
        {/each}
        {#if favoriteArtists.length === 0}
            <div
                class="col-span-full text-center py-10 text-[var(--text-secondary)]"
            >
                No favorite artists found.
            </div>
        {/if}
    </div>
</div>
