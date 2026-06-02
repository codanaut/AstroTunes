<script>
    import {
        queue,
        clearQueue,
        shuffleCurrentQueue,
        toggleQueue,
    } from "$lib/player.js";
    import { X, Trash2, Shuffle } from "lucide-svelte";
    import QueueList from "./QueueList.svelte";
</script>

<aside
    class="fixed inset-0 z-[60] md:static w-full md:w-80 bg-[var(--bg-sidebar)] backdrop-blur-lg border-l border-[var(--border-primary)] flex flex-col overflow-hidden"
    style="padding-top: env(safe-area-inset-top); padding-bottom: env(safe-area-inset-bottom);"
>
    <div
        class="p-4 border-b border-[var(--border-primary)] flex justify-between items-center"
    >
        <div>
            <h2 class="text-xl font-bold">Queue</h2>
            <p class="text-sm text-[var(--text-secondary)]">
                {$queue.length} tracks
            </p>
        </div>
        <div class="flex gap-1">
            <button
                onclick={shuffleCurrentQueue}
                class="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                title="Shuffle Queue"
            >
                <Shuffle size={18} />
            </button>
            <button
                onclick={clearQueue}
                class="p-1.5 text-[var(--text-secondary)] hover:text-red-500 transition-colors"
                title="Clear Queue"
            >
                <Trash2 size={18} />
            </button>
            <button
                onclick={toggleQueue}
                class="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors md:hidden"
                title="Close"
            >
                <X size={24} />
            </button>
        </div>
    </div>

    <QueueList />
</aside>
