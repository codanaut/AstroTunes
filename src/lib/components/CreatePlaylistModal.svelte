<script>
    import { createPlaylist } from "../subsonic";
    import { X, Loader2 } from "lucide-svelte";
    import { fade, scale } from "svelte/transition";

    let { isOpen = false, onclose, onsuccess } = $props();

    let playlistName = $state("");
    let isLoading = $state(false);
    let error = $state("");

    async function handleSubmit() {
        if (!playlistName.trim()) return;

        isLoading = true;
        error = "";

        try {
            const res = await createPlaylist(playlistName);
            if (res && res.status === "ok") {
                onsuccess?.();
                close();
            } else {
                error = res?.error?.message || "Failed to create playlist";
            }
        } catch (e) {
            error = "An unexpected error occurred";
            console.error(e);
        } finally {
            isLoading = false;
        }
    }

    function close() {
        isOpen = false;
        playlistName = "";
        error = "";
        onclose?.();
    }
</script>

{#if isOpen}
    <!-- Backdrop -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        transition:fade={{ duration: 200 }}
        onclick={close}
    >
        <!-- Modal Content -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
            class="bg-[var(--bg-card)] border border-[var(--border-primary)] w-full max-w-md rounded-xl shadow-2xl overflow-hidden"
            transition:scale={{ duration: 200, start: 0.95 }}
            onclick={(e) => e.stopPropagation()}
        >
            <div
                class="flex justify-between items-center p-4 border-b border-[var(--border-primary)]"
            >
                <h2 class="text-lg font-bold text-[var(--text-primary)]">
                    Create Playlist
                </h2>
                <button
                    onclick={close}
                    class="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                    <X size={20} />
                </button>
            </div>

            <form
                onsubmit={(e) => {
                    e.preventDefault();
                    handleSubmit();
                }}
                class="p-4 flex flex-col gap-4"
            >
                {#if error}
                    <div
                        class="bg-red-500/10 border border-red-500/20 text-red-500 px-3 py-2 rounded text-sm"
                    >
                        {error}
                    </div>
                {/if}

                <div class="flex flex-col gap-2">
                    <label
                        for="playlist-name"
                        class="text-sm font-medium text-[var(--text-secondary)]"
                        >Name</label
                    >
                    <!-- svelte-ignore a11y_autofocus -->
                    <input
                        type="text"
                        id="playlist-name"
                        bind:value={playlistName}
                        placeholder="My Awesome Playlist"
                        class="bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                        autoFocus
                    />
                </div>

                <div class="flex justify-end gap-3 mt-2">
                    <button
                        type="button"
                        onclick={close}
                        class="px-4 py-2 rounded-md text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={!playlistName.trim() || isLoading}
                        class="bg-[var(--accent)] text-[var(--accent-fg)] px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-opacity"
                    >
                        {#if isLoading}
                            <Loader2 size={16} class="animate-spin" />
                            Creating...
                        {:else}
                            Create
                        {/if}
                    </button>
                </div>
            </form>
        </div>
    </div>
{/if}
