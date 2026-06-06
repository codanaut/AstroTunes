<script>
    import { getInfo } from "../subsonic";
    import { X } from "lucide-svelte";
    import { portal } from "../utils/portal";
    import { fade, scale } from "svelte/transition";

    let { isOpen = false, onclose, type, id } = $props();
    function close() {
        isOpen = false;
        onclose?.();
    }

    /** @type {any}*/
    let info = $state(null);
    $effect(() => {
        if (isOpen) {
            getInfo(type, id).then((data) => {
                info = data;
            });
        }
    });
</script>

{#if isOpen}
    <!-- Backdrop -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        use:portal
        class="fixed inset-0 bg-[var(--bg-card)]/50 backdrop-blur-lg z-50 flex items-center justify-center p-4"
        transition:fade={{ duration: 200 }}
        onclick={close}
    >
        <!-- Modal Content -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
            class="bg-[var(--bg-card)] backdrop-blur-lg border border-[var(--border-primary)] w-full md:max-w-2xl max-h-[70vh] rounded-lg shadow-2xl overflow-scroll"
            transition:scale={{ duration: 200, start: 0.95 }}
            onclick={(e) => e.stopPropagation()}
        >
            <div
                class="flex justify-between items-center p-4 border-b border-[var(--border-primary)]"
            >
                <h2 class="text-lg font-bold text-[var(--text-primary)]">
                    {type == "song"
                        ? "Track"
                        : type.charAt(0).toUpperCase() + type.slice(1)}
                    Information
                </h2>
                <button
                    onclick={close}
                    class="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                    <X size={20} />
                </button>
            </div>

            <div>
                {#if info}
                    <div class="p-4">
                        <h2
                            class="text-lg font-bold text-[var(--text-primary)] mb-4"
                        >
                            {#if type === "song"}
                                {info.song.title}
                            {:else if type === "album"}
                                {info.album.name}
                            {:else if type === "artist"}
                                {info.artist.name}
                            {/if}
                        </h2>

                        {#each Object.entries(type === "song" ? info.song : info.album ? info.album : info.artist) as [key, value]}
                            {#if value !== null && value !== "" && key !== "name"}
                                <div class="text-[var(--text-secondary)] mb-2">
                                    <strong class="capitalize">{key}:</strong>

                                    {#if Array.isArray(value)}
                                        <ul class="pl-4 list-disc text-sm">
                                            {#each value as item}
                                                <li>
                                                    {#if typeof item === "object"}
                                                        {item.name ||
                                                            item.title ||
                                                            JSON.stringify(
                                                                item,
                                                            )}
                                                    {:else}
                                                        {item}
                                                    {/if}
                                                </li>
                                            {/each}
                                        </ul>
                                    {:else if typeof value === "object"}
                                        <span class="text-sm italic">
                                            {value.formatted ||
                                                value.date ||
                                                JSON.stringify(value)}
                                        </span>
                                    {:else}
                                        <span>{value}</span>
                                    {/if}
                                </div>
                            {/if}
                        {/each}
                    </div>
                {:else}
                    <div class="p-4 text-[var(--text-secondary)]">
                        Loading...
                    </div>
                {/if}
            </div>
        </div>
    </div>
{/if}
