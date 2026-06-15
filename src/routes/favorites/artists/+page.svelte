<script>
    import { onMount, onDestroy } from "svelte";
    import { subsonicFetch, getCoverArtUrl } from "../../../lib/subsonic.js";
    import BackButton from "../../../lib/components/BackButton.svelte";
    import { resolve } from "$app/paths";
    import { untrack } from "svelte";
    import {
        libraryStore,
        musicFolderParam,
    } from "../../../lib/stores/library.js";

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
        if (starred && starred.starred && starred.starred.artist) {
            favoriteArtists = starred.starred.artist;
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

<div class="container mx-auto p-6">
    <BackButton />
    <div class="flex items-center gap-4 mb-6">
        <h1 class="text-3xl font-bold text-[var(--text-primary)]">
            Favorite Artists
        </h1>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {#each favoriteArtists as artist}
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
