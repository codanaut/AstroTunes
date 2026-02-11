<svelte:options runes={false} />

<script>
    import {
        currentTrack,
        queue,
        playQueue,
        removeFromQueue,
        clearQueue,
        shuffleCurrentQueue,
        showQueue,
        toggleQueue,
    } from "$lib/player.js";
    import { X, Trash2, Shuffle, GripVertical } from "lucide-svelte";
    import { dndzone } from "svelte-dnd-action";
    import { flip } from "svelte/animate";

    // Map queue to items with unique `id` for dndzone (legacy reactive mode)
    /** @type {any[]} */
    let items = [];
    $: {
        items = $queue.map((track) => ({
            ...track,
            id: track.queueId || track.id,
            originalId: track.id,
        }));
    }

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
</script>

<aside
    class="fixed inset-0 z-40 md:static w-full md:w-80 bg-[var(--bg-sidebar)] border-l border-[var(--border-primary)] flex flex-col overflow-hidden"
>
    <div
        class="p-4 border-b border-[var(--border-primary)] flex justify-between items-center mt-16 md:mt-0"
    >
        <div>
            <h2 class="text-xl font-bold">Queue</h2>
            <p class="text-sm text-[var(--text-secondary)]">
                {$queue.length} tracks
            </p>
        </div>
        <div class="flex gap-2">
            <button
                on:click={shuffleCurrentQueue}
                class="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                title="Shuffle Queue"
            >
                <Shuffle size={18} />
            </button>
            <button
                on:click={clearQueue}
                class="p-2 text-[var(--text-secondary)] hover:text-red-500"
                title="Clear Queue"
            >
                <Trash2 size={18} />
            </button>
            <button
                on:click={toggleQueue}
                class="p-2 text-[var(--text-secondary)]"
            >
                <X />
            </button>
        </div>
    </div>
    <div
        class="flex-1 overflow-y-auto"
        use:dndzone={{
            items: items,
            flipDurationMs: items.length > 100 ? 0 : 300,
            dropTargetStyle: {},
        }}
        on:consider={handleDndConsider}
        on:finalize={handleDndFinalize}
    >
        {#each items as track, index (track.id)}
            <div
                class="group relative p-3 border-b border-[var(--border-primary)] hover:bg-[var(--bg-card)] transition-colors flex gap-3 items-center
                    {$currentTrack?.id === track.originalId
                    ? 'bg-[var(--bg-card)] border-l-4 border-l-[var(--accent)]'
                    : ''}"
                animate:flip={{ duration: items.length > 100 ? 0 : 300 }}
            >
                <!-- DRAG HANDLE -->
                <div
                    class="cursor-grab active:cursor-grabbing text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    aria-label="drag-handle"
                >
                    <GripVertical size={16} />
                </div>

                <button
                    type="button"
                    class="flex-1 min-w-0 cursor-pointer flex items-start gap-3 text-left bg-transparent border-0 p-0"
                    on:click={() => {
                        const newQueue = items.map((t) => ({
                            ...t,
                            id: t.originalId,
                        }));
                        playQueue(newQueue, index);
                    }}
                >
                    <span
                        class="text-sm text-[var(--text-muted)] w-6 shrink-0 text-center"
                        >{index + 1}</span
                    >
                    <div class="flex-1 min-w-0 text-left">
                        <div
                            class="font-medium truncate {$currentTrack?.id ===
                            track.originalId
                                ? 'text-[var(--accent)]'
                                : 'text-[var(--text-primary)]'}"
                        >
                            {track.title}
                        </div>
                        <div
                            class="text-sm text-[var(--text-secondary)] truncate"
                        >
                            {track.artist}
                        </div>
                        <div class="text-xs text-[var(--text-muted)] truncate">
                            {track.album}
                        </div>
                    </div>
                    {#if track.duration}
                        <span
                            class="text-xs text-[var(--text-muted)] shrink-0 self-center"
                        >
                            {new Date(track.duration * 1000)
                                .toISOString()
                                .substr(14, 5)}
                        </span>
                    {/if}
                </button>

                <!-- HOVER ACTIONS -->
                <div
                    class="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1 bg-[var(--bg-card)] shadow-md rounded-md p-1"
                >
                    <button
                        on:click|stopPropagation={() => removeFromQueue(index)}
                        class="p-1 text-[var(--text-secondary)] hover:text-red-500"
                        title="Remove"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>
        {/each}
    </div>
</aside>
