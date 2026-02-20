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

    /** @type {any[]} */
    let favoriteAlbums = $state([]);
    /** @type {any[]} */
    let favoriteSongs = $state([]);
    /** @type {any[]} */
    let favoriteArtists = $state([]);

    onMount(async () => {
        await loadFavorites();
        startSyncLoop();
    });

    onDestroy(() => {
        if (syncInterval) clearInterval(syncInterval);
    });

    async function loadFavorites() {
        const starred = await subsonicFetch("getStarred");
        if (starred && starred.starred) {
            if (starred.starred.album) {
                favoriteAlbums = starred.starred.album;
            }
            if (starred.starred.song) {
                favoriteSongs = starred.starred.song;
            }
            if (starred.starred.artist) {
                favoriteArtists = starred.starred.artist;
            }
        }
    }

    /** @type {any} */
    let syncInterval;

    function startSyncLoop() {
        if (syncInterval) clearInterval(syncInterval);
        syncInterval = setInterval(async () => {
            await loadFavorites();
        }, 10000);
    }
</script>

<div class="container mx-auto p-4 md:p-8 pb-32">
    <!-- FAVORITE SONGS SECTION -->
    <div
        class="flex flex-col md:flex-row items-center justify-between mt-6 mb-6 gap-4"
    >
        <div class="flex items-center gap-3">
            <div
                class="p-3 bg-[var(--bg-card)] rounded-full text-[var(--accent)] border border-[var(--border-primary)]"
            >
                <Music size={24} />
            </div>
            <h1 class="text-3xl font-bold text-[var(--text-primary)]">
                <a
                    href={resolve("/favorites/songs")}
                    class="hover:text-[var(--accent)] transition-colors"
                    >Favorite Songs</a
                >
            </h1>
            {#if favoriteSongs.length > 0}
                <div class="flex gap-2 ml-2">
                    <button
                        onclick={() =>
                            playQueue(favoriteSongs, 0, {
                                type: "favorites",
                                id: "all",
                                name: "Favorite Songs",
                            })}
                        class="p-2 bg-[var(--accent)] text-[var(--accent-fg)] rounded-md hover:opacity-90 transition-opacity"
                        title="Play All"
                    >
                        <Play size={20} fill="currentColor" />
                    </button>
                    <button
                        onclick={() => playQueueShuffled(favoriteSongs)}
                        class="p-2 bg-[var(--bg-card)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-md hover:bg-[var(--bg-hover)] transition-colors"
                        title="Shuffle Play"
                    >
                        <Shuffle size={20} />
                    </button>
                </div>
            {/if}
        </div>
        <ShowAllButton href={resolve("/favorites/songs")} label="Show All" />
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
        class="flex flex-col md:flex-row items-center justify-between mb-6 gap-4"
    >
        <div class="flex items-center gap-3">
            <div
                class="p-3 bg-[var(--bg-card)] rounded-full text-[var(--accent)] border border-[var(--border-primary)]"
            >
                <Disc size={24} />
            </div>
            <h1 class="text-3xl font-bold text-[var(--text-primary)]">
                <a
                    href={resolve("/favorites/albums")}
                    class="hover:text-[var(--accent)] transition-colors"
                    >Favorite Albums</a
                >
                {#if favoriteAlbums.length > 0}
                    <span
                        class="text-[var(--text-secondary)] text-lg font-normal ml-2"
                    >
                        - {favoriteAlbums.length}
                    </span>
                {/if}
            </h1>
        </div>
        <ShowAllButton href={resolve("/favorites/albums")} label="Show All" />
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
        class="flex flex-col md:flex-row items-center justify-between mb-6 gap-4"
    >
        <div class="flex items-center gap-3">
            <div
                class="p-3 bg-[var(--bg-card)] rounded-full text-[var(--accent)] border border-[var(--border-primary)]"
            >
                <Mic2 size={24} />
            </div>
            <h1 class="text-3xl font-bold text-[var(--text-primary)]">
                <a
                    href={resolve("/favorites/artists")}
                    class="hover:text-[var(--accent)] transition-colors"
                    >Favorite Artists</a
                >
                {#if favoriteArtists.length > 0}
                    <span
                        class="text-[var(--text-secondary)] text-lg font-normal ml-2"
                    >
                        - {favoriteArtists.length}
                    </span>
                {/if}
            </h1>
        </div>
        <ShowAllButton href={resolve("/favorites/artists")} label="Show All" />
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
