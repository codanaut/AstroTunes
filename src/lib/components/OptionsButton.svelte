<script>
    import { addToQueue } from "$lib/player.js";
    import { updatePlaylist, subsonicFetch } from "$lib/subsonic.js";
    import AddToPlaylistModal from "$lib/components/AddToPlaylistModal.svelte";
    import InfoModal from "$lib/components/InfoModal.svelte";
    import {
        MoreVertical,
        ListPlus,
        Plus,
        Trash2,
        User,
        Album,
        Info,
    } from "lucide-svelte";
    import { scale } from "svelte/transition";
    import { portal } from "$lib/utils/portal";
    import { resolve } from "$app/paths";
    import { goto } from "$app/navigation";

    /**
     * @typedef {Object} Props
     * @property {any} item - The item object
     * @property {'song' | 'album' | 'artist'} [itemType] - The type of the item (default: 'song')
     * @property {string} [context] - The context from which the button is rendered (e.g. 'playlist', 'album')
     * @property {string|null} [contextId] - The ID of the context (e.g. playlist ID)
     * @property {() => void} [onPlaylistUpdated] - Callback for when context playlist updates
     * @property {string} [className] - Optional CSS classes for the trigger button
     * @property {boolean} [isOpen] - Whether the menu is currently open
     * @property {(open: boolean) => void} [onToggle] - Callback to toggle the open state
     */

    /** @type {Props} */
    let {
        item,
        itemType = "song",
        context = "",
        contextId = null,
        onPlaylistUpdated,
        className = "",
        isOpen = false,
        onToggle,
    } = $props();

    let showAddModal = $state(false);
    let localIsOpen = $state(false);
    let menuPosition = $state({ x: 0, y: 0 });
    /** @type {any[]} */
    let songsToProcess = $state([]);
    let showInfoModal = $state(false);

    // Determine if the menu is open by checking if parent controls it, otherwise use local fallback
    let isMenuOpen = $derived(onToggle ? isOpen : localIsOpen);

    // Helper function to safely update the state regardless of who owns it
    /** @param {boolean} value */
    function setOpenState(value) {
        if (onToggle) {
            onToggle(value);
        } else {
            localIsOpen = value;
        }
    }

    /** @param {MouseEvent} event */
    function openMenu(event) {
        event.preventDefault();
        event.stopPropagation();

        if (isMenuOpen) {
            setOpenState(false);
            return;
        }

        const target = /** @type {HTMLElement} */ (event.currentTarget);
        const rect = target.getBoundingClientRect();

        const menuWidth = 180;
        const menuHeight = itemType === "album" ? 180 : 150;
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
        setOpenState(true);
    }

    function closeMenu() {
        setOpenState(false);
    }

    async function getSongsForItem() {
        if (!item) return [];
        if (itemType === "album") {
            const data = await subsonicFetch("getAlbum", `&id=${item.id}`);
            if (data?.album?.song) {
                return Array.isArray(data.album.song)
                    ? data.album.song
                    : [data.album.song];
            }
        } else if (itemType === "song") {
            return [item];
        } else if (itemType === "artist") {
            const artistName = item.name || item.artist;
            if (artistName) {
                const data = await subsonicFetch(
                    "getTopSongs",
                    `&artist=${encodeURIComponent(artistName)}&count=50`,
                );
                if (data?.topSongs?.song) {
                    return Array.isArray(data.topSongs.song)
                        ? data.topSongs.song
                        : [data.topSongs.song];
                }
            }
        }
        return [];
    }

    function handleWindowClick() {
        if (isMenuOpen) closeMenu();
    }

    /** @param {MouseEvent} event */
    async function handleAddToPlaylist(event) {
        event.preventDefault();
        event.stopPropagation();
        songsToProcess = await getSongsForItem();
        if (songsToProcess.length > 0) {
            showAddModal = true;
        }
        closeMenu();
    }

    /** @param {MouseEvent} event */
    async function handleAddToQueue(event) {
        event.preventDefault();
        event.stopPropagation();
        /** @type {any[]} */
        const songs = await getSongsForItem();
        songs.forEach((song) => addToQueue(song));
        closeMenu();
    }

    /** @param {MouseEvent} event */
    async function handleRemoveFromPlaylist(event) {
        event.preventDefault();
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
    songs={songsToProcess}
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

{#if isMenuOpen}
    <div
        use:portal
        class="fixed z-[9999] bg-[var(--bg-card)] backdrop-blur-lg border border-[var(--border-primary)] rounded-lg shadow-xl py-1 min-w-[180px]"
        style="top: {menuPosition.y}px; left: {menuPosition.x}px;"
        transition:scale={{ duration: 150, start: 0.95 }}
    >
        {#if itemType === "song" || itemType === "album" || itemType === "artist"}
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
        {/if}

        {#if context === "playlist" && itemType === "song"}
            <button
                class="w-full text-left px-4 py-2 text-sm hover:bg-[var(--bg-hover)] text-red-500 flex items-center gap-2"
                onclick={handleRemoveFromPlaylist}
            >
                <Trash2 size={16} /> Remove
            </button>
        {/if}

        <div class="h-px bg-[var(--border-secondary)] my-1"></div>

        {#if item?.artistId && itemType !== "artist"}
            <a
                href={resolve(`/artist/${item.artistId}`)}
                class="w-full text-left px-4 py-2 text-sm hover:bg-[var(--bg-hover)] text-[var(--text-primary)] flex items-center gap-2"
                onclick={(e) => {
                    e.preventDefault();
                    closeMenu();
                    goto(resolve(`/artist/${item.artistId}`));
                }}
            >
                <User size={16} /> Go to Artist
            </a>
        {/if}

        {#if item?.albumId && itemType === "song"}
            <a
                href={resolve(`/album/${item.albumId}`)}
                class="w-full text-left px-4 py-2 text-sm hover:bg-[var(--bg-hover)] text-[var(--text-primary)] flex items-center gap-2"
                onclick={(e) => {
                    e.preventDefault();
                    closeMenu();
                    goto(resolve(`/album/${item.albumId}`));
                }}
            >
                <Album size={16} /> Go to Album
            </a>
        {/if}
        <div class="h-px bg-[var(--border-secondary)] my-1"></div>
        <button
            class="w-full text-left px-4 py-2 text-sm hover:bg-[var(--bg-hover)] text-[var(--text-primary)] flex items-center gap-2"
            onclick={() => {
                showInfoModal = true;
            }}
        >
            <Info size={16} />
            {itemType === "song"
                ? "Song"
                : itemType === "album"
                  ? "Album"
                  : "Artist"} Info
        </button>
    </div>
{/if}

{#if showInfoModal}
    <InfoModal
        isOpen={showInfoModal}
        type={itemType}
        id={item.id}
        onclose={() => {
            showInfoModal = false;
        }}
        onsuccess={() => {
            // Optional: show toast or success message
        }}
    />
{/if}
