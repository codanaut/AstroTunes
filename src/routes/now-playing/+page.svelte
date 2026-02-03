<script>
    import {
        currentTrack,
        isPlaying,
        togglePlay,
        playNext,
        playPrev,
        progress,
        duration,
        seek,
        isFavorite,
        toggleFavorite,
        queue,
        playQueue,
        removeFromQueue,
        moveInQueue,
        shuffleCurrentQueue,
        repeatMode,
        toggleRepeat,
        context,
    } from "../../lib/player";
    import { getCoverArtUrl } from "../../lib/subsonic";
    import {
        Play,
        Pause,
        SkipBack,
        SkipForward,
        Heart,
        Shuffle,
        Repeat,
        Repeat1,
        ListMusic,
        ChevronDown,
        Disc,
        Mic2,
        X,
        ArrowUp,
        ArrowDown,
        Music,
    } from "lucide-svelte";
    import BackButton from "../../lib/components/BackButton.svelte";
    import { fade, slide } from "svelte/transition";
    import { parseArtistString } from "../../lib/utils/artistUtils";

    let showQueuePanel = false;

    /**
     * @param {{ currentTarget: any; clientX: number; }} e
     */
    function handleSeek(e) {
        const bar = e.currentTarget;
        const rect = bar.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = x / rect.width;
        seek(percentage * $duration);
    }
</script>

<div
    class="h-full flex flex-col md:flex-row overflow-hidden bg-gradient-to-b from-[var(--bg-card)] to-[var(--bg-main)]"
>
    {#if $currentTrack}
        <!-- MAIN CONTENT (Left/Top) -->
        <div
            class="flex-1 flex flex-col p-4 md:p-12 items-center relative overflow-y-auto"
        >
            <!-- TOP BAR (Back Button) -->
            <div class="w-full flex justify-start mb-4 shrink-0">
                <BackButton />
            </div>

            <!-- CONTENT WRAPPER (Centers Art & Info properly) -->
            <div
                class="flex-1 flex flex-col items-center justify-center w-full min-h-min gap-4 md:gap-8 grow shrink-0 py-2"
            >
                <!-- ARTWORK -->
                <div
                    class="w-full max-w-[260px] md:max-w-xs aspect-square relative group shrink-0"
                    style="max-height: 40vh;"
                >
                    <img
                        src={getCoverArtUrl($currentTrack.id)}
                        alt="Album Art"
                        class="w-full h-full object-cover rounded-xl shadow-2xl"
                    />
                </div>

                <!-- INFO -->
                <div class="w-full max-w-md text-center">
                    <h1
                        class="text-xl md:text-3xl font-bold mb-1 truncate px-4"
                    >
                        {$currentTrack.title}
                    </h1>
                    <div
                        class="text-base md:text-lg text-[var(--text-secondary)] truncate flex items-center justify-center gap-2 px-4"
                    >
                        <span>
                            {#each parseArtistString($currentTrack.artist, $currentTrack.artistId, $currentTrack.artists) as part}
                                {#if part.type === "artist"}
                                    <a
                                        href={part.id
                                            ? `/artist/${part.id}`
                                            : `/search?q=${encodeURIComponent(part.name)}`}
                                        class="hover:text-[var(--text-primary)] hover:underline"
                                    >
                                        {part.name}
                                    </a>
                                {:else}
                                    <span>{part.name}</span>
                                {/if}
                            {/each}
                        </span>
                    </div>
                    <div
                        class="text-xs md:text-sm text-[var(--text-muted)] mt-1 flex items-center justify-center gap-2"
                    >
                        <a
                            href="/album/{$currentTrack.albumId}"
                            class="hover:text-[var(--text-primary)] hover:underline"
                            >{$currentTrack.album}</a
                        >
                    </div>
                    <!-- CONTEXT LINK -->
                    {#if $context}
                        <div
                            class="mt-3 text-[10px] md:text-xs font-mono uppercase tracking-wider text-[var(--accent)] bg-[var(--accent)]/10 px-3 py-1 rounded-full inline-block"
                        >
                            Playing from {[
                                "album",
                                "artist",
                                "playlist",
                            ].includes($context.type || "")
                                ? $context.type
                                : ""}:
                            <a
                                href={$context.type === "favorites"
                                    ? "/favorites"
                                    : $context.type === "search"
                                      ? `/search?q=${encodeURIComponent($context.id || "")}`
                                      : $context.type === "playlist"
                                        ? `/playlists?id=${encodeURIComponent($context.id || "")}`
                                        : `/${$context.type}/${encodeURIComponent($context.id || "")}`}
                                class="hover:underline"
                                >{$context.name || "Unknown"}</a
                            >
                        </div>
                    {/if}
                </div>
            </div>

            <!-- CONTROLS CONTAINER -->
            <div
                class="w-full max-w-md flex flex-col gap-4 md:gap-6 px-4 mt-4 md:mt-0 shrink-0"
            >
                <!-- PROGRESS BAR -->
                <div
                    class="w-full flex items-center gap-3 text-xs font-mono text-[var(--text-secondary)]"
                >
                    <span
                        >{new Date($progress * 1000)
                            .toISOString()
                            .substr(14, 5)}</span
                    >
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <div
                        class="flex-1 h-1.5 bg-[var(--bg-hover)] rounded-full relative cursor-pointer group"
                        onclick={handleSeek}
                    >
                        <div
                            class="h-full bg-[var(--text-primary)] rounded-full absolute top-0 left-0 group-hover:bg-[var(--accent)] transition-colors"
                            style="width: {($progress / $duration) * 100}%"
                        ></div>
                    </div>
                    <span
                        >{new Date($duration * 1000)
                            .toISOString()
                            .substr(14, 5)}</span
                    >
                </div>

                <!-- BUTTONS -->
                <div class="flex items-center justify-between">
                    <button
                        onclick={toggleRepeat}
                        class="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-2"
                        title="Repeat"
                    >
                        {#if $repeatMode === "one"}
                            <Repeat1 size={24} class="text-[var(--accent)]" />
                        {:else if $repeatMode === "all"}
                            <Repeat size={24} class="text-[var(--accent)]" />
                        {:else}
                            <Repeat size={24} />
                        {/if}
                    </button>

                    <div class="flex items-center gap-6">
                        <button
                            onclick={playPrev}
                            class="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-2 hover:scale-110 transition-transform"
                        >
                            <SkipBack size={32} />
                        </button>
                        <button
                            onclick={togglePlay}
                            class="bg-[var(--text-primary)] text-[var(--bg-main)] rounded-full p-4 hover:scale-105 transition-transform shadow-lg"
                        >
                            {#if $isPlaying}
                                <Pause size={32} fill="currentColor" />
                            {:else}
                                <Play
                                    size={32}
                                    fill="currentColor"
                                    class="ml-1"
                                />
                            {/if}
                        </button>
                        <button
                            onclick={playNext}
                            class="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-2 hover:scale-110 transition-transform"
                        >
                            <SkipForward size={32} />
                        </button>
                    </div>

                    <button
                        onclick={toggleFavorite}
                        class="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-2"
                        title="Favorite"
                    >
                        <Heart
                            size={24}
                            class={$isFavorite
                                ? "text-red-500 fill-red-500"
                                : ""}
                        />
                    </button>
                </div>
            </div>

            <!-- QUEUE TOGGLE (Mobile Only) -->
            <button
                class="md:hidden mt-4 flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] shrink-0"
                onclick={() => (showQueuePanel = !showQueuePanel)}
            >
                <ListMusic size={20} />
                <span>Show Queue</span>
                <ChevronDown
                    size={16}
                    class="transition-transform {showQueuePanel
                        ? 'rotate-180'
                        : ''}"
                />
            </button>
        </div>

        <!-- QUEUE PANEL (Right Side - Desktop) -->
        <div
            class="hidden md:flex flex-col w-96 border-l border-[var(--border-primary)] bg-[var(--bg-sidebar)]"
        >
            <div
                class="p-4 border-b border-[var(--border-primary)] flex justify-between items-center"
            >
                <h2 class="font-bold text-lg">Queue</h2>
                <div class="flex gap-1">
                    <button
                        onclick={shuffleCurrentQueue}
                        class="p-2 hover:bg-[var(--bg-hover)] rounded-md transition-colors"
                        title="Shuffle Upcoming"
                    >
                        <Shuffle size={18} />
                    </button>
                </div>
            </div>
            <div class="flex-1 overflow-y-auto">
                {#each $queue as track, index}
                    <div
                        class="group relative p-3 border-b border-[var(--border-primary)] hover:bg-[var(--bg-card)] transition-colors flex gap-3 items-center
                        {$currentTrack?.id === track.id
                            ? 'bg-[var(--bg-card)] border-l-4 border-l-[var(--accent)]'
                            : ''}"
                    >
                        <div
                            class="min-w-[1.5rem] text-center text-xs text-[var(--text-muted)]"
                        >
                            {#if $currentTrack?.id === track.id}
                                <div
                                    class="w-2 h-2 rounded-full bg-[var(--accent)] mx-auto animate-pulse"
                                ></div>
                            {:else}
                                {index + 1}
                            {/if}
                        </div>
                        <button
                            type="button"
                            class="flex-1 min-w-0 cursor-pointer text-left bg-transparent border-0 p-0"
                            onclick={() => playQueue($queue, index)}
                        >
                            <div
                                class="truncate font-medium text-sm {$currentTrack?.id ===
                                track.id
                                    ? 'text-[var(--accent)]'
                                    : ''}"
                            >
                                {track.title}
                            </div>
                            <div
                                class="truncate text-xs text-[var(--text-secondary)]"
                            >
                                {track.artist}
                            </div>
                        </button>
                        <!-- HOVER ACTIONS -->
                        <div class="hidden group-hover:flex items-center gap-1">
                            <button
                                onclick={() => removeFromQueue(index)}
                                class="p-1 text-[var(--text-muted)] hover:text-red-500"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    </div>
                {/each}
            </div>
        </div>

        <!-- QUEUE OVERLAY (Mobile) -->
        {#if showQueuePanel}
            <div
                class="fixed inset-0 z-50 bg-[var(--bg-main)] md:hidden flex flex-col"
                transition:slide={{ axis: "y", duration: 300 }}
            >
                <div
                    class="p-4 border-b border-[var(--border-primary)] flex justify-between items-center bg-[var(--bg-card)]"
                >
                    <h2 class="font-bold text-lg">Queue</h2>
                    <button
                        onclick={() => (showQueuePanel = false)}
                        class="p-2"
                    >
                        <X size={24} />
                    </button>
                </div>
                <div class="flex-1 overflow-y-auto p-4">
                    {#each $queue as track, index}
                        <button
                            type="button"
                            class="mb-2 p-3 rounded-lg bg-[var(--bg-card)] flex gap-3 items-center w-full text-left
                            {$currentTrack?.id === track.id
                                ? 'border border-[var(--accent)]'
                                : ''}"
                            onclick={() => {
                                playQueue($queue, index);
                                showQueuePanel = false;
                            }}
                        >
                            <span
                                class="text-sm font-mono text-[var(--text-muted)] w-6"
                                >{index + 1}</span
                            >
                            <div class="flex-1 min-w-0">
                                <div class="truncate font-bold text-sm">
                                    {track.title}
                                </div>
                                <div
                                    class="truncate text-xs text-[var(--text-secondary)]"
                                >
                                    {track.artist}
                                </div>
                            </div>
                        </button>
                    {/each}
                </div>
            </div>
        {/if}
    {:else}
        <div
            class="w-full h-full flex flex-col items-center justify-center text-[var(--text-muted)]"
        >
            <Music size={64} class="mb-4 opacity-50" />
            <p>Nothing playing</p>
            <BackButton />
        </div>
    {/if}
</div>
