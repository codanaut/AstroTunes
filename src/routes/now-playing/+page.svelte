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
        clearQueue,
        shuffleCurrentQueue,
        repeatMode,
        toggleRepeat,
        context,
    } from "../../lib/player";
    import { getCoverArtUrl } from "../../lib/subsonic";
    import OptionsButton from "../../lib/components/OptionsButton.svelte";
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
        Trash2,
        Music,
    } from "lucide-svelte";
    import BackButton from "../../lib/components/BackButton.svelte";
    import QueueList from "../../lib/components/QueueList.svelte";
    import { fade, slide } from "svelte/transition";
    import { parseArtistString } from "../../lib/utils/artistUtils";
    import { reorderPlaylist } from "../../lib/subsonic";
    import { resolve } from "$app/paths";

    let showQueuePanel = $state(false);

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
            class="flex-1 flex flex-col p-4 md:p-4 items-center relative overflow-hidden h-full"
        >
            <!-- TOP BAR (Back Button) -->
            <div class="w-full flex justify-start mb-2 shrink-0">
                <BackButton />
            </div>

            <!-- CONTENT WRAPPER (Centers Art & Info properly) -->
            <div
                class="flex-1 flex flex-col items-center justify-center w-full min-h-0 gap-4 md:gap-2 grow py-2"
            >
                <!-- ARTWORK -->
                <div
                    class="w-full max-w-[280px] md:max-w-xs flex-1 min-h-0 relative group flex items-center justify-center"
                >
                    <img
                        src={getCoverArtUrl($currentTrack.id)}
                        alt="Album Art"
                        class="max-w-full max-h-full aspect-square object-cover rounded-xl shadow-2xl"
                    />
                </div>

                <!-- INFO -->
                <div class="w-full max-w-md text-center shrink-0 mt-0">
                    <h1
                        class="text-xl md:text-2xl font-bold mb-0.5 truncate px-4"
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
                                            ? resolve(`/artist/${part.id}`)
                                            : resolve("/search") +
                                              `?q=${encodeURIComponent(part.name)}`}
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
                        class="text-xs md:text-sm text-[var(--text-muted)] mt-0.5 flex items-center justify-center gap-2"
                    >
                        <a
                            href={resolve(`/album/${$currentTrack.albumId}`)}
                            class="hover:text-[var(--text-primary)] hover:underline"
                            >{$currentTrack.album}</a
                        >
                    </div>
                    <!-- CONTEXT LINK -->
                    {#if $context}
                        <div
                            class="mt-3 text-[10px] md:text-xs font-mono uppercase tracking-wider text-[var(--accent)] bg-[var(--accent)]/10 px-3 py-1 rounded-full inline-block"
                        >
                            Playing from
                            <a
                                href={$context.type === "favorites"
                                    ? resolve("/favorites")
                                    : $context.type === "search"
                                      ? resolve("/search") +
                                        `?q=${encodeURIComponent($context.id || "")}`
                                      : $context.type === "playlist"
                                        ? resolve("/playlists") +
                                          `?id=${encodeURIComponent($context.id || "")}`
                                        : $context.type === "album"
                                          ? resolve("/album") +
                                            `/${encodeURIComponent($context.id || "")}`
                                          : resolve("/artist") +
                                            `/${encodeURIComponent($context.id || "")}`}
                                class="hover:underline font-bold"
                            >
                                {$context.name}
                            </a>
                        </div>
                    {/if}
                </div>
            </div>

            <!-- CONTROLS CONTAINER -->
            <div
                class="w-full max-w-md flex flex-col gap-4 md:gap-6 px-4 mt-2 md:mt-0 shrink-0 mb-4 md:mb-0"
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
                            class="text-[var(--bg-accent)] rounded-full p-4 hover:scale-105 transition-transform"
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

                    <div class="flex items-center gap-1">
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
                        <OptionsButton
                            item={$currentTrack}
                            className="p-2 md:p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                        />
                    </div>
                </div>
            </div>

            <!-- QUEUE TOGGLE (Mobile Only) -->
            <button
                class="md:hidden mt-2 mb-4 flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] shrink-0"
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
                <div class="flex flex-col">
                    <h2 class="font-bold text-lg">Queue</h2>
                    <p class="text-xs text-[var(--text-secondary)]">
                        {$queue.length} tracks
                    </p>
                </div>
                <div class="flex gap-1">
                    <button
                        onclick={togglePlay}
                        class="p-2 text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors"
                        title={$isPlaying ? "Pause" : "Play"}
                    >
                        {#if $isPlaying}
                            <Pause size={18} fill="currentColor" />
                        {:else}
                            <Play size={18} fill="currentColor" />
                        {/if}
                    </button>
                    <button
                        onclick={shuffleCurrentQueue}
                        class="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                        title="Shuffle Queue"
                    >
                        <Shuffle size={18} />
                    </button>
                    <button
                        onclick={clearQueue}
                        class="p-2 text-[var(--text-secondary)] hover:text-red-500 transition-colors"
                        title="Clear Queue"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>
            <QueueList />
        </div>

        <!-- QUEUE OVERLAY (Mobile) -->
        {#if showQueuePanel}
            <div
                class="fixed inset-0 z-50 bg-[var(--bg-main)] backdrop-blur-lg md:hidden flex flex-col"
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
                    <QueueList isMobile={true} />
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
