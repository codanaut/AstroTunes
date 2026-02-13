<script>
    import { onMount, onDestroy } from "svelte";
    import {
        subsonicFetch,
        starTrack,
        unstarTrack,
    } from "../../../lib/subsonic.js";
    import {
        playQueue,
        playQueueShuffled,
        currentTrack,
        isPlaying,
    } from "../../../lib/player.js";
    import { Play, Shuffle } from "lucide-svelte";
    import BackButton from "../../../lib/components/BackButton.svelte";
    import SongList from "../../../lib/components/SongList.svelte";

    /** @type {any[]} */
    let favoriteSongs = [];

    onMount(async () => {
        await loadFavorites();
        startSyncLoop();
    });

    onDestroy(() => {
        if (syncInterval) clearInterval(syncInterval);
    });

    async function loadFavorites() {
        const starred = await subsonicFetch("getStarred");
        if (starred && starred.starred && starred.starred.song) {
            favoriteSongs = starred.starred.song;
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

<div class="w-full mx-auto p-6">
    <BackButton />
    <div class="flex items-center gap-4 mb-6">
        <h1 class="text-3xl font-bold text-[var(--accent)]">Favorite Songs</h1>
        {#if favoriteSongs.length > 0}
            <div class="flex gap-2">
                <button
                    onclick={() =>
                        playQueue(favoriteSongs, 0, {
                            type: "favorites",
                            id: "all",
                            name: "Favorite Songs",
                        })}
                    class="p-3 bg-green-500 rounded-full text-black hover:scale-105 transition-transform shadow-lg"
                    title="Play All"
                >
                    <Play size={20} fill="black" />
                </button>
                <button
                    onclick={() => playQueueShuffled(favoriteSongs)}
                    class="p-3 bg-gray-800 rounded-full text-white hover:bg-gray-700 transition-colors shadow-lg border border-gray-700"
                    title="Shuffle Play"
                >
                    <Shuffle size={20} />
                </button>
            </div>
        {/if}
    </div>

    <div class="flex flex-col">
        <SongList
            songs={favoriteSongs}
            context="favorites"
            contextId="all"
            contextName="Favorite Songs"
        />
    </div>
</div>
