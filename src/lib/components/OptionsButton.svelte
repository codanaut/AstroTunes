<script>
    import { addToQueue } from "$lib/player.js";
    import { updatePlaylist } from "$lib/subsonic.js";
    import AddToPlaylistModal from "$lib/components/AddToPlaylistModal.svelte";
    import {
        MoreVertical,
        ListPlus,
        Plus,
        Trash2,
        User,
        Album,
    } from "lucide-svelte";
    import { slide, scale } from "svelte/transition";
    import { resolve } from "$app/paths";

    /**
     * @typedef {Object} Props
     * @property {any} item - The item object
     * @property {string} [context] - The context from which the button is rendered (e.g. 'playlist', 'album')
     * @property {string|null} [contextId] - The ID of the context (e.g. playlist ID)
     * @property {() => void} [onPlaylistUpdated] - Callback for when context playlist updates
     * @property {string} [className] - Optional CSS classes for the trigger button
     */

    /** @type {Props} */
    let {
        item,
        context = "",
        contextId = null,
        onPlaylistUpdated,
        className = "",
    } = $props();

    let showAddModal = $state(false);
    let isOpen = $state(false);
    let menuPosition = $state({ x: 0, y: 0 });

    /** @param {MouseEvent} event */
    function openMenu(event) {
        event.stopPropagation();
        isOpen = true;

        const target = /** @type {HTMLElement} */ (event.currentTarget);
        const rect = target.getBoundingClientRect();

        const menuWidth = 180;
        const menuHeight = 150;
        const screenPadding = 10;

        let xPos = rect.right - menuWidth;
        if (xPos < screenPadding) xPos = screenPadding;
        if (xPos + menuWidth > window.innerWidth) {
            xPos = window.innerWidth - menuWidth - screenPadding;
        }

        const availableHeight = window.innerHeight - rect.bottom;
        let yPos;

        if (availableHeight < menuHeight) {
            yPos = rect.top - menuHeight;
        } else {
            yPos = rect.bottom;
        }

        menuPosition = { x: xPos, y: yPos };
    }

    function closeMenu() {
        isOpen = false;
    }

    function handleWindowClick() {
        if (isOpen) closeMenu();
    }

    /** @param {HTMLElement} node */
    function portal(node) {
        document.body.appendChild(node);
        return {
            destroy() {
                if (node.parentNode) {
                    node.parentNode.removeChild(node);
                }
            },
        };
    }

    /** @param {MouseEvent} event */
    function handleAddToPlaylist(event) {
        event.stopPropagation();
        showAddModal = true;
        closeMenu();
    }

    /** @param {MouseEvent} event */
    function handleAddToQueue(event) {
        event.stopPropagation();
        addToQueue(item);
        closeMenu();
    }

    /** @param {MouseEvent} event */
    async function handleRemoveFromPlaylist(event) {
        event.stopPropagation();
        if (!contextId) return;

        try {
            await updatePlaylist(contextId, {
                // globalIndex is expected to be present on the song object from SongList
                songIndexesToRemove: [item.globalIndex],
            });
            onPlaylistUpdated?.();
        } catch (e) {
            console.error("Failed to remove song from playlist", e);
        }
        closeMenu();
    }
</script>

<svelte:window onclick={handleWindowClick} onscroll={closeMenu} />

<AddToPlaylistModal
    isOpen={showAddModal}
    songs={[item]}
    onclose={() => {
        showAddModal = false;
    }}
    onsuccess={() => {
        // Optional: show toast or success message
    }}
/>

<button
    class="rounded-full hover:bg-[var(--bg-active)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all {className}"
    onclick={openMenu}
    aria-label="Options"
>
    <MoreVertical size={16} />
</button>

{#if isOpen}
    <div
        use:portal
        class="fixed z-[9999] bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg shadow-xl py-1 min-w-[180px]"
        style="top: {menuPosition.y}px; left: {menuPosition.x}px;"
        transition:scale={{ duration: 150, start: 0.95 }}
    >
        <button
            class="w-full text-left px-4 py-2 text-sm hover:bg-[var(--bg-hover)] text-[var(--text-primary)] flex items-center gap-2"
            onclick={handleAddToQueue}
        >
            <ListPlus size={16} /> Add to Queue
        </button>

        <button
            class="w-full text-left px-4 py-2 text-sm hover:bg-[var(--bg-hover)] text-[var(--text-primary)] flex items-center gap-2"
            onclick={handleAddToPlaylist}
        >
            <Plus size={16} /> Add to Playlist
        </button>

        {#if context === "playlist"}
            <button
                class="w-full text-left px-4 py-2 text-sm hover:bg-[var(--bg-hover)] text-red-500 flex items-center gap-2"
                onclick={handleRemoveFromPlaylist}
            >
                <Trash2 size={16} /> Remove
            </button>
        {/if}

        <div class="h-px bg-[var(--border-secondary)] my-1"></div>

        {#if item?.artistId}
            <a
                href={resolve(`/artist/${item.artistId}`)}
                class="w-full text-left px-4 py-2 text-sm hover:bg-[var(--bg-hover)] text-[var(--text-primary)] flex items-center gap-2"
                onclick={() => closeMenu()}
            >
                <User size={16} /> Go to Artist
            </a>
        {/if}

        {#if item?.albumId}
            <a
                href={resolve(`/album/${item.albumId}`)}
                class="w-full text-left px-4 py-2 text-sm hover:bg-[var(--bg-hover)] text-[var(--text-primary)] flex items-center gap-2"
                onclick={() => closeMenu()}
            >
                <Album size={16} /> Go to Album
            </a>
        {/if}
    </div>
{/if}
