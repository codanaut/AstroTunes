<script>
    import {
        currentTrack,
        queue,
        playQueue,
        removeFromQueue,
    } from "$lib/player.js";
    import { X, GripVertical } from "lucide-svelte";
    import { dragHandleZone, dragHandle } from "svelte-dnd-action";
    import { flip } from "svelte/animate";
    import { resolve } from "$app/paths";
    import { parseArtistString } from "$lib/utils/artistUtils";

    /** @type {{ className?: string, isMobile?: boolean }} */
    let { className = "", isMobile = false } = $props();

    // Map queue to items with unique `id` for dndzone
    /** @type {any[]} */
    let items = $state([]);
    $effect(() => {
        items = $queue.map((track) => ({
            ...track,
            id: track.queueId || track.id,
            originalId: track.id,
        }));
    });

    // Find current track index based on queueId (unique per instance in queue) or fallback to ID
    const currentIndex = $derived(
        $queue.findIndex((t) =>
            $currentTrack?.queueId && t.queueId
                ? t.queueId === $currentTrack.queueId
                : t.id === $currentTrack?.id,
        ),
    );

    // Scroll active track into view when current track changes
    /** @type {HTMLElement | null} */
    let containerEl = $state(null);

    $effect(() => {
        if (currentIndex !== -1 && containerEl) {
            setTimeout(() => {
                const activeEl = containerEl?.querySelector(
                    '[data-current="true"]',
                );
                if (activeEl) {
                    activeEl.scrollIntoView({
                        behavior: "smooth",
                        block: "nearest",
                    });
                }
            }, 100);
        }
    });

    /**
     * @param {CustomEvent<any>} e
     */
    function handleDndConsider(e) {
        items = e.detail.items;
    }

    /**
     * @param {CustomEvent<any>} e
     */
    function handleDndFinalize(e) {
        items = e.detail.items;
        const newQueue = items.map((track) => ({
            ...track,
            id: track.originalId,
        }));
        queue.set(newQueue);
    }

    /**
     * @param {Event} e
     * @param {number} index
     */
    function handleTrackClick(e, index) {
        const target = /** @type {HTMLElement} */ (e.target);
        if (target.closest("a") || target.closest("button")) return;

        const newQueue = items.map((t) => ({
            ...t,
            id: t.originalId,
        }));
        playQueue(newQueue, index);
    }
</script>

<div
    bind:this={containerEl}
    class="flex-1 overflow-y-auto {className}"
    use:dragHandleZone={{
        items: items,
        flipDurationMs: items.length > 100 ? 0 : 300,
        dropTargetStyle: {},
    }}
    onconsider={handleDndConsider}
    onfinalize={handleDndFinalize}
>
    {#each items as track, index (track.id)}
        {@const isCurrent = index === currentIndex}
        {@const isPast = currentIndex !== -1 && index < currentIndex}

        <div
            class="w-full flex flex-col"
            animate:flip={{ duration: items.length > 100 ? 0 : 300 }}
        >
            <!-- SECTION HEADERS -->
            {#if index === 0 && currentIndex > 0}
                <div
                    class="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-2 select-none"
                >
                    <span>History</span>
                    <div
                        class="h-[1px] bg-[var(--border-primary)] flex-1 opacity-30"
                    ></div>
                </div>
            {:else if isCurrent}
                <div
                    class="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--accent)] flex items-center gap-2 select-none"
                >
                    <span>Now Playing</span>
                    <div class="h-[1px] bg-[var(--accent)]/20 flex-1"></div>
                </div>
            {:else if index === currentIndex + 1}
                <div
                    class="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-2 select-none"
                >
                    <span>Up Next</span>
                    <div
                        class="h-[1px] bg-[var(--border-primary)] flex-1 opacity-30"
                    ></div>
                </div>
            {/if}

            <div
                role="button"
                tabindex="0"
                onkeydown={(e) =>
                    (e.key === "Enter" || e.key === " ") &&
                    handleTrackClick(e, index)}
                onclick={(e) => handleTrackClick(e, index)}
                class="group relative p-3 border-b border-[var(--border-primary)] hover:bg-[var(--bg-card)] transition-colors flex gap-3 items-center
                    {isMobile ? 'mb-2 rounded-lg bg-[var(--bg-card)]' : ''}
                    {isCurrent
                    ? 'bg-[var(--bg-card)] border-l-4 border-l-[var(--accent)] ' +
                      (isMobile ? 'border border-[var(--accent)]' : '')
                    : ''}
                    {isPast ? 'opacity-55' : ''}"
                data-current={isCurrent}
            >
                <!-- DRAG HANDLE -->
                <div
                    use:dragHandle
                    class="cursor-grab active:cursor-grabbing text-[var(--text-muted)] hover:text-[var(--text-primary)] shrink-0"
                    aria-label="drag-handle"
                >
                    <GripVertical size={isMobile ? 20 : 16} />
                </div>

                <div
                    class="min-w-[1.5rem] text-center text-xs text-[var(--text-muted)] shrink-0"
                >
                    {#if isCurrent}
                        <div
                            class="w-2 h-2 rounded-full bg-[var(--accent)] mx-auto animate-pulse"
                        ></div>
                    {:else}
                        {index + 1}
                    {/if}
                </div>

                <div class="flex-1 min-w-0">
                    <div
                        class="truncate font-medium text-sm {isCurrent
                            ? 'text-[var(--accent)]'
                            : 'text-[var(--text-primary)]'}"
                    >
                        {track.title}
                    </div>
                    <div
                        class="truncate text-xs text-[var(--text-secondary)] flex flex-wrap gap-1"
                    >
                        <span>
                            {#each parseArtistString(track.artist, track.artistId, track.artists) as part}
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
                        {#if track.album}
                            <span class="text-[var(--text-muted)]">•</span>
                            <a
                                href={resolve(`/album/${track.albumId}`)}
                                class="hover:text-[var(--text-primary)] hover:underline truncate"
                            >
                                {track.album}
                            </a>
                        {/if}
                    </div>
                </div>

                <!-- DURATION & REMOVE BUTTON -->
                <div class="flex items-center gap-2 shrink-0">
                    {#if track.duration && !isMobile}
                        <span class="text-xs text-[var(--text-muted)]">
                            {new Date(track.duration * 1000)
                                .toISOString()
                                .substr(14, 5)}
                        </span>
                    {/if}

                    <button
                        onclick={(e) => {
                            e.stopPropagation();
                            removeFromQueue(index);
                        }}
                        class="p-1 text-[var(--text-secondary)] hover:text-red-500 transition-colors rounded-md opacity-70"
                        title="Remove from queue"
                    >
                        <X size={isMobile ? 18 : 14} />
                    </button>
                </div>
            </div>
        </div>
    {/each}
</div>
