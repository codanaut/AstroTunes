<script>
    import {
        currentTrack,
        queue,
        playQueue,
        removeFromQueue,
    } from "$lib/player.js";
    import { X, GripVertical } from "lucide-svelte";
    import { dndzone } from "svelte-dnd-action";
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
    class="flex-1 overflow-y-auto {className}"
    use:dndzone={{
        items: items,
        flipDurationMs: items.length > 100 ? 0 : 300,
        dropTargetStyle: {},
    }}
    onconsider={handleDndConsider}
    onfinalize={handleDndFinalize}
>
    {#each items as track, index (track.id)}
        <div
            role="button"
            tabindex="0"
            onkeydown={(e) =>
                (e.key === "Enter" || e.key === " ") &&
                handleTrackClick(e, index)}
            onclick={(e) => handleTrackClick(e, index)}
            class="group relative p-3 border-b border-[var(--border-primary)] hover:bg-[var(--bg-card)] transition-colors flex gap-3 items-center
                {isMobile ? 'mb-2 rounded-lg bg-[var(--bg-card)]' : ''}
                {$currentTrack?.id === track.originalId
                ? 'bg-[var(--bg-card)] border-l-4 border-l-[var(--accent)] ' +
                  (isMobile ? 'border border-[var(--accent)]' : '')
                : ''}"
            animate:flip={{ duration: items.length > 100 ? 0 : 300 }}
        >
            <!-- DRAG HANDLE -->
            <div
                class="cursor-grab active:cursor-grabbing text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                aria-label="drag-handle"
            >
                <GripVertical size={isMobile ? 20 : 16} />
            </div>

            <div
                class="min-w-[1.5rem] text-center text-xs text-[var(--text-muted)]"
            >
                {#if $currentTrack?.id === track.originalId}
                    <div
                        class="w-2 h-2 rounded-full bg-[var(--accent)] mx-auto animate-pulse"
                    ></div>
                {:else}
                    {index + 1}
                {/if}
            </div>

            <div class="flex-1 min-w-0">
                <div
                    class="truncate font-medium text-sm {$currentTrack?.id ===
                    track.originalId
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

            {#if track.duration && !isMobile}
                <span
                    class="text-xs text-[var(--text-muted)] shrink-0 self-center"
                >
                    {new Date(track.duration * 1000)
                        .toISOString()
                        .substr(14, 5)}
                </span>
            {/if}

            <!-- HOVER ACTIONS -->
            <div
                class="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1 bg-[var(--bg-card)] shadow-md rounded-md p-1 z-20"
            >
                <button
                    onclick={(e) => {
                        e.stopPropagation();
                        removeFromQueue(index);
                    }}
                    class="p-1 text-[var(--text-secondary)] hover:text-red-500"
                    title="Remove"
                >
                    <X size={14} />
                </button>
            </div>
        </div>
    {/each}
</div>
