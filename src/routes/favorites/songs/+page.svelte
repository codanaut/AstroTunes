<script>
    import { onMount, onDestroy } from "svelte";
    import { subsonicFetch } from "../../../lib/subsonic.js";
    import { playQueue, playQueueShuffled } from "../../../lib/player.js";
    import { Play, Shuffle, Music } from "lucide-svelte";
    import BackButton from "../../../lib/components/BackButton.svelte";
    import SongList from "../../../lib/components/SongList.svelte";

    /** @type {any[]} */
    let favoriteSongs = $state([]);

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

<div class="w-full mx-auto md:p-8 pb-32">
    <BackButton />

    <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
            <div
                class="p-3 bg-[var(--bg-card)] rounded-full text-[var(--accent)] border border-[var(--border-primary)]"
            >
                <Music size={24} />
            </div>
            <h1
                class="text-2xl md:text-3xl font-bold text-[var(--text-primary)]"
            >
                Favorite Songs
                {#if favoriteSongs.length > 0}
                    <span
                        class="text-[var(--text-secondary)] text-lg font-normal ml-2"
                    >
                        - {favoriteSongs.length}
                    </span>
                {/if}
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
                        class="p-2 bg-[var(--accent)] text-[var(--accent-fg)] rounded-full hover:opacity-90 transition-opacity"
                        title="Play All"
                    >
                        <Play size={20} fill="currentColor" />
                    </button>
                    <button
                        onclick={() => playQueueShuffled(favoriteSongs)}
                        class="p-2 bg-[var(--bg-card)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-full hover:bg-[var(--bg-hover)] transition-colors"
                        title="Shuffle Play"
                    >
                        <Shuffle size={20} />
                    </button>
                </div>
            {/if}
        </div>
    </div>

    <div class="flex flex-col -mx-4 md:mx-0">
        <SongList
            songs={favoriteSongs}
            context="favorites"
            contextId="all"
            contextName="Favorite Songs"
        />
    </div>
</div>
