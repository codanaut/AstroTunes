<script>
    import { onMount, onDestroy } from "svelte";
    import {
        subsonicFetch,
        getCoverArtUrl,
        starAlbum,
        unstarAlbum,
        starTrack,
        unstarTrack,
    } from "../../lib/subsonic.js";
    import {
        playQueue,
        playQueueShuffled,
        currentTrack,
        isPlaying,
    } from "../../lib/player.js";
    import { Play, Shuffle, Heart } from "lucide-svelte";
    import ShowAllButton from "../../lib/components/ShowAllButton.svelte";
    import SongList from "../../lib/components/SongList.svelte";
    import { resolve } from "$app/paths";

    /** @type {any[]} */
    let favoriteAlbums = [];
    /** @type {any[]} */
    let favoriteSongs = [];
    /** @type {any[]} */
    let favoriteArtists = [];

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
                console.log(favoriteSongs);
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

    /**
     * Toggle starred status for an album
     * @param {any} album
     * @param {Event} event
     */
    async function toggleAlbumFavorite(album, event) {
        event.preventDefault();
        event.stopPropagation();

        const isStarred = !!album.starred;

        try {
            if (isStarred) {
                await unstarAlbum(album.id);
                album.starred = undefined;
            } else {
                await starAlbum(album.id);
                album.starred = new Date().toISOString();
            }
            // Force reactivity
            favoriteAlbums = favoriteAlbums;
        } catch (error) {
            console.error("Failed to toggle album favorite:", error);
        }
    }
</script>

<div class="container mx-auto p-6 pb-[30%] md:pb-[10%]">
    <!-- FAVORITE SONGS SECTION -->
    <div class="flex items-center justify-between mt-6 mb-6">
        <div class="flex items-center gap-4">
            <h1 class="text-2xl font-bold text-[var(--accent)]">
                <a href={resolve("/favorites/songs")}>Favorite Songs</a>
            </h1>
            {#if favoriteSongs.length > 0}
                <div class="flex gap-2">
                    <button
                        onclick={() =>
                            playQueue(favoriteSongs, 0, {
                                type: "favorites",
                                id: "all",
                                name: "Favorite Songs",
                            })}
                        class="p-2 bg-green-500 rounded-full text-black hover:scale-105 transition-transform"
                        title="Play All"
                    >
                        <Play size={16} fill="black" />
                    </button>
                    <button
                        onclick={() => playQueueShuffled(favoriteSongs)}
                        class="p-2 bg-gray-800 rounded-full text-white hover:bg-gray-700 transition-colors"
                        title="Shuffle Play"
                    >
                        <Shuffle size={16} />
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
    <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-[var(--accent)]">
            <a href={resolve("/favorites/albums")}>Favorite Albums</a>
        </h1>
        <ShowAllButton href={resolve("/favorites/albums")} label="Show All" />
    </div>
    <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-12">
        {#each favoriteAlbums.slice(0, 10) as favoriteAlbum}
            <a
                href={resolve(`/album/${favoriteAlbum.id}`)}
                class="text-left group block"
            >
                <div
                    class="relative aspect-square mb-2 overflow-hidden rounded-lg bg-gray-800"
                >
                    <img
                        src={getCoverArtUrl(favoriteAlbum.id)}
                        alt={favoriteAlbum.title}
                        class="object-cover w-full h-full transform group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                    />
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <div
                        onclick={(e) => toggleAlbumFavorite(favoriteAlbum, e)}
                        class="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 hover:bg-black/70 transition-colors opacity-0 group-hover:opacity-100 {favoriteAlbum.starred
                            ? 'opacity-100'
                            : ''}"
                    >
                        <Heart
                            size={18}
                            class={favoriteAlbum.starred
                                ? "text-red-500 fill-red-500"
                                : "text-white"}
                        />
                    </div>
                </div>
                <div
                    class="font-medium truncate text-white group-hover:text-green-400 transition-colors"
                >
                    {favoriteAlbum.title}
                </div>
                <div class="text-sm text-gray-400 truncate">
                    {favoriteAlbum.artist}
                </div>
            </a>
        {/each}
    </div>

    <!-- FAVORITE ARTISTS SECTION -->
    <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-[var(--accent)]">
            <a href={resolve("/favorites/artists")}>Favorite Artists</a>
        </h1>
        <ShowAllButton href={resolve("/favorites/artists")} label="Show All" />
    </div>
    <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {#each favoriteArtists.slice(0, 10) as artist}
            <a
                href={resolve(`/artist/${artist.id}`)}
                class="text-left group block"
            >
                <div
                    class="relative aspect-square mb-2 overflow-hidden rounded-full bg-gray-800"
                >
                    <img
                        src={getCoverArtUrl(artist.id)}
                        alt={artist.name}
                        class="object-cover w-full h-full transform group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                    />
                </div>
                <div
                    class="font-medium truncate text-white text-center mt-2 group-hover:text-green-400 transition-colors"
                >
                    {artist.name}
                </div>
            </a>
        {/each}
    </div>
</div>
