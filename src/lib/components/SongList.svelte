<script>
    import { createEventDispatcher } from "svelte";
    import {
        playQueue,
        currentTrack,
        isPlaying,
        isFavorite,
    } from "../player.js";
    import { starTrack, unstarTrack, updatePlaylist } from "../subsonic.js";
    import AddToPlaylistModal from "./AddToPlaylistModal.svelte";
    import {
        Heart,
        Clock,
        Music,
        Disc,
        Settings2,
        Check,
        Play,
        MoreVertical,
        Plus,
        Trash2,
        User,
        Album,
    } from "lucide-svelte";
    import { slide, fade, scale } from "svelte/transition";

    import { parseArtistString } from "../utils/artistUtils.js";
    import { dndzone } from "svelte-dnd-action";
    import { flip } from "svelte/animate";
    import { reorderPlaylist } from "../subsonic.js";
    import { GripVertical } from "lucide-svelte";

    /** @type {any[]} */
    export let songs = [];
    /** @type {'album' | 'artist' | 'playlist' | 'showAll' | 'favorites'} */
    export let context = "playlist";
    /** @type {number} */
    export let limit = 0;

    /** @type {string|null} */
    export let contextId = null;
    /** @type {string|null} */
    export let contextName = null;

    const dispatch = createEventDispatcher();

    // Column definitions
    const ALL_COLUMNS = [
        { id: "track", label: "#", alwaysVisible: true, sortable: true },
        { id: "title", label: "Title", alwaysVisible: true, sortable: true },
        { id: "album", label: "Album", alwaysVisible: false, sortable: true },
        { id: "artist", label: "Artist", alwaysVisible: false, sortable: true },
        { id: "year", label: "Year", alwaysVisible: false, sortable: true },
        {
            id: "quality",
            label: "Quality",
            alwaysVisible: false,
            sortable: true,
        }, // Bit depth / Samplerate
        {
            id: "bitrate",
            label: "Bitrate",
            alwaysVisible: false,
            sortable: true,
        },
        { id: "format", label: "Format", alwaysVisible: false, sortable: true },
        { id: "genre", label: "Genre", alwaysVisible: false, sortable: true },
        {
            id: "playCount",
            label: "Plays",
            alwaysVisible: false,
            sortable: true,
        },
        {
            id: "duration",
            label: "",
            icon: Clock,
            alwaysVisible: true,
            sortable: true,
        },
        {
            id: "starred",
            label: "",
            icon: Heart,
            alwaysVisible: true,
            sortable: false,
        },
        {
            id: "options",
            label: "",
            icon: MoreVertical,
            alwaysVisible: true,
            sortable: false,
        },
    ];

    // Determine default visible columns based on context
    let visibleColumnIds = [
        "track",
        "title",
        "duration",
        "starred",
        "year",
        "quality",
        "bitrate",
        "format",
        "genre",
        "playCount",
        "options",
    ];

    // Basic Logic for defaults
    if (context !== "album") {
        visibleColumnIds.push("album");
    }
    if (context !== "artist") {
        visibleColumnIds.push("artist");
    }

    // Helper to check visibility
    $: isColumnVisible = (/** @type {string} */ id) =>
        visibleColumnIds.includes(id);

    $: displayedSongs = limit > 0 ? songs.slice(0, limit) : songs;

    $: useDiscGrouping =
        context === "album" && displayedSongs.some((s) => s.discNumber > 1);

    $: groupedSongs = useDiscGrouping
        ? displayedSongs.reduce((acc, song, index) => {
              song.globalIndex = index;
              const disc = song.discNumber || 1;
              let lastGroup = acc[acc.length - 1];
              if (!lastGroup || lastGroup.disc !== disc) {
                  lastGroup = { disc, songs: [] };
                  acc.push(lastGroup);
              }
              lastGroup.songs.push(song);
              return acc;
          }, [])
        : [
              {
                  disc: 1,
                  songs: displayedSongs.map((s, i) => ({
                      ...s,
                      globalIndex: i,
                  })),
              },
          ];

    /** @param {number} index */
    function playSong(index) {
        if (songs) {
            /** @type {null | { type: string, id: string, name: string }} */
            let queueContext = null;
            if (contextId && contextName) {
                queueContext = {
                    type: context,
                    id: contextId,
                    name: contextName,
                };
            }
            playQueue(songs, index, queueContext);
        }
    }

    /** @param {number} seconds */
    function formatDuration(seconds) {
        if (!seconds) return "--:--";
        const min = Math.floor(seconds / 60);
        const sec = seconds % 60;
        return `${min}:${sec.toString().padStart(2, "0")}`;
    }

    /**
     * @param {number | undefined} bitrate
     */
    function formatBitrate(bitrate) {
        return bitrate ? `${bitrate} kbps` : "";
    }

    /** @param {any} song */
    function formatQuality(song) {
        if (song.bitDepth && song.samplingRate) {
            return `${song.bitDepth}/${song.samplingRate / 1000}kHz`;
        }
        return "";
    }

    /** @param {any} song */
    function getTrackNumber(song) {
        // If in artist context (Top Songs), we want 1-10 ranking, not album track number
        if (
            context === "artist" ||
            context === "playlist" ||
            context === "favorites"
        ) {
            return song.globalIndex + 1;
        }
        return song.track || song.globalIndex + 1;
    }

    /**
     * @param {any} song
     * @param {Event} event
     */
    async function toggleFavorite(song, event) {
        event.stopPropagation();

        // Find the index in the source array to ensure we update the source of truth
        const songIndex = songs.findIndex((s) => s.id === song.id);
        if (songIndex === -1) return;

        const targetSong = songs[songIndex];
        const isStarred = !!targetSong.starred;

        try {
            if (isStarred) {
                await unstarTrack(targetSong.id);
                const updated = { ...targetSong, starred: undefined };
                songs[songIndex] = updated;

                // Sync with global player if it's the current track
                if ($currentTrack && $currentTrack.id === targetSong.id) {
                    isFavorite.set(false);
                    currentTrack.update((t) => ({ ...t, starred: undefined }));
                }
            } else {
                await starTrack(targetSong.id);
                const updated = {
                    ...targetSong,
                    starred: new Date().toISOString(),
                };
                songs[songIndex] = updated;

                // Sync with global player if it's the current track
                if ($currentTrack && $currentTrack.id === targetSong.id) {
                    isFavorite.set(true);
                    currentTrack.update((t) => ({
                        ...t,
                        starred: updated.starred,
                    }));
                }
            }
            songs = songs; // Trigger reactivity
        } catch (error) {
            console.error("Failed to toggle favorite:", error);
        }
    }

    // Sync external favorite changes (from player bar) to the list
    $: if ($currentTrack && $isFavorite !== undefined) {
        const idx = songs.findIndex((s) => s.id === $currentTrack.id);
        if (idx !== -1) {
            const song = songs[idx];
            const shouldBeStarred = $isFavorite;
            const isStarred = !!song.starred;

            if (shouldBeStarred !== isStarred) {
                // Update local list to match global state
                songs[idx] = {
                    ...song,
                    starred: shouldBeStarred
                        ? song.starred || new Date().toISOString()
                        : undefined,
                };
                songs = songs; // Trigger reactivity
            }
        }
    }

    let showColumnSelector = false;

    /** @param {string} id */
    function toggleColumn(id) {
        if (visibleColumnIds.includes(id)) {
            visibleColumnIds = visibleColumnIds.filter((c) => c !== id);
        } else {
            visibleColumnIds = [...visibleColumnIds, id];
        }
    }

    $: desktopGridColumns = `
        ${context === "playlist" ? "2rem" : ""}
        ${isColumnVisible("track") ? "3rem" : ""} 
        minmax(200px, 3fr) 
        ${isColumnVisible("artist") ? "minmax(150px, 2fr)" : ""} 
        ${isColumnVisible("album") ? "minmax(150px, 2fr)" : ""} 
        ${isColumnVisible("year") ? "4rem" : ""} 
        ${isColumnVisible("quality") ? "6rem" : ""} 
        ${isColumnVisible("bitrate") ? "5rem" : ""} 
        ${isColumnVisible("format") ? "4rem" : ""} 
        ${isColumnVisible("genre") ? "minmax(100px, 1.5fr)" : ""} 
        ${isColumnVisible("playCount") ? "4rem" : ""} 
        ${isColumnVisible("starred") ? "2rem" : ""} 
        ${isColumnVisible("duration") ? "auto" : ""}
        ${isColumnVisible("options") ? "2rem" : ""}
    `
        .replace(/\s+/g, " ")
        .trim();

    // Menu Logic
    /** @type {string|null} */
    let activeMenuSongId = null;
    let menuPosition = { x: 0, y: 0 };
    let showAddModal = false;
    /** @type {any} */
    let songToAdd = null;

    $: activeMenuSong = activeMenuSongId
        ? songs.find((s) => s.id === activeMenuSongId)
        : null;

    /**
     * @param {MouseEvent} event
     * @param {any} song
     */
    function openMenu(event, song) {
        event.stopPropagation();
        activeMenuSongId = song.id;

        // Calculate position
        const target = /** @type {HTMLElement} */ (event.target);
        const rect = target.getBoundingClientRect();
        const availableHeight = window.innerHeight - rect.bottom;
        const menuHeight = 150; // Approx

        if (availableHeight < menuHeight) {
            menuPosition = { x: rect.right - 180, y: rect.top - menuHeight };
        } else {
            menuPosition = { x: rect.right - 180, y: rect.bottom };
        }
    }

    function closeMenu() {
        activeMenuSongId = null;
    }

    function handleWindowClick() {
        if (activeMenuSongId) closeMenu();
    }

    /** @param {CustomEvent<any>} e */
    function handleDndConsider(e) {
        songs = e.detail.items;
    }

    /** @param {CustomEvent<any>} e */
    async function handleDndFinalize(e) {
        songs = e.detail.items;
        if (context === "playlist" && contextId) {
            // Optimistic update done, now save
            try {
                // @ts-ignore
                await reorderPlaylist(
                    contextId,
                    songs.map((s) => s.id),
                );
                // Notify parent to refresh if needed (e.g. sidebar)
                dispatch("playlistUpdated");
            } catch (err) {
                console.error("Failed to reorder playlist:", err);
            }
        }
    }

    /** @param {any} song */
    function handleAddToPlaylist(song) {
        songToAdd = song;
        showAddModal = true;
        closeMenu();
    }

    /** @param {any} song */
    async function handleRemoveFromPlaylist(song) {
        if (!contextId) return;

        // Optimistic UI update could be tricky here with re-indexing, so we'll wait for server
        try {
            await updatePlaylist(contextId, {
                songIndexesToRemove: [song.globalIndex],
            });
            // Notify parent to refresh
            dispatch("playlistUpdated");
        } catch (e) {
            console.error("Failed to remove song from playlist", e);
        }
        closeMenu();
    }
</script>

<svelte:window on:click={handleWindowClick} />

<AddToPlaylistModal
    isOpen={showAddModal}
    songs={songToAdd ? [songToAdd] : []}
    on:close={() => {
        showAddModal = false;
        songToAdd = null;
    }}
    on:success={() => {
        // Optional: show toast or success message
    }}
/>

<div class="w-full flex flex-col relative">
    <!-- Options Header -->
    <div class="flex justify-end mb-2 px-4 relative">
        <button
            class="text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-2 text-xs uppercase font-bold tracking-wider transition-colors"
            onclick={() => (showColumnSelector = !showColumnSelector)}
        >
            <Settings2 size={16} />
            <span>Customize</span>
        </button>

        {#if showColumnSelector}
            <div
                transition:slide={{ duration: 200 }}
                class="absolute right-4 top-8 z-50 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg shadow-xl p-4 min-w-[200px]"
            >
                <div
                    class="text-xs font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-wider"
                >
                    Visible Columns
                </div>
                <div class="flex flex-col gap-2">
                    {#each ALL_COLUMNS.filter((c) => !c.alwaysVisible) as col}
                        <button
                            class="flex items-center gap-2 text-sm text-left hover:bg-[var(--bg-hover)] p-2 rounded transition-colors"
                            onclick={() => toggleColumn(col.id)}
                        >
                            <div
                                class="w-4 h-4 border border-[var(--border-secondary)] rounded flex items-center justify-center {isColumnVisible(
                                    col.id,
                                )
                                    ? 'bg-[var(--accent)] border-[var(--accent)]'
                                    : ''}"
                            >
                                {#if isColumnVisible(col.id)}
                                    <Check size={12} class="text-black" />
                                {/if}
                            </div>
                            <span
                                class={isColumnVisible(col.id)
                                    ? "text-[var(--text-primary)]"
                                    : "text-[var(--text-secondary)]"}
                                >{col.label || col.id}</span
                            >
                        </button>
                    {/each}
                </div>
            </div>
        {/if}
    </div>

    <!-- Header Row -->
    <div
        class="song-grid gap-4 px-4 py-2 text-sm text-[var(--text-secondary)] border-b border-[var(--border-primary)] uppercase tracking-wider items-center"
        style="--desktop-cols: {desktopGridColumns};"
    >
        {#if context === "playlist"}<span class="text-center"></span>{/if}
        {#if isColumnVisible("track")}<span class="text-center">#</span>{/if}
        <span>Title</span>
        {#if isColumnVisible("artist")}<span class="hidden md:block"
                >Artist</span
            >{/if}
        {#if isColumnVisible("album")}<span class="hidden md:block">Album</span
            >{/if}
        {#if isColumnVisible("year")}<span class="hidden md:block">Year</span
            >{/if}
        {#if isColumnVisible("quality")}<span class="hidden md:block"
                >Quality</span
            >{/if}
        {#if isColumnVisible("bitrate")}<span class="hidden md:block"
                >Bitrate</span
            >{/if}
        {#if isColumnVisible("format")}<span class="hidden md:block"
                >Format</span
            >{/if}
        {#if isColumnVisible("genre")}<span class="hidden md:block">Genre</span
            >{/if}
        {#if isColumnVisible("playCount")}<span
                class="hidden md:block text-right">Plays</span
            >{/if}
        {#if isColumnVisible("starred")}<span
                class="text-center hidden md:block"><Heart size={16} /></span
            >{/if}
        {#if isColumnVisible("duration")}
            <span class="text-right flex justify-end"><Clock size={16} /></span
            >{/if}
        {#if isColumnVisible("options")}
            <span class="text-center"></span>
        {/if}
    </div>

    <!-- Rows -->
    <div
        class="mt-2"
        use:dndzone={{
            items: songs,
            flipDurationMs: 300,
            dragDisabled: context !== "playlist",
            dropTargetStyle: {},
        }}
        onconsider={handleDndConsider}
        onfinalize={handleDndFinalize}
    >
        {#each groupedSongs as group (group.disc)}
            {#if useDiscGrouping && groupedSongs.length > 1}
                <div
                    class="flex items-center gap-2 px-4 py-3 mt-4 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider bg-white/5 rounded-md"
                >
                    <Disc size={16} />
                    <span>Disc {group.disc}</span>
                </div>
            {/if}

            {#each group.songs as song (song.id)}
                <div
                    role="button"
                    tabindex="0"
                    animate:flip={{ duration: 300 }}
                    onkeydown={(e) =>
                        (e.key === "Enter" || e.key === " ") &&
                        playSong(song.globalIndex)}
                    onclick={(e) => {
                        // Prevent row click when clicking links or buttons
                        if (
                            e.target instanceof Element &&
                            (e.target.closest("a") ||
                                e.target.closest("button"))
                        )
                            return;
                        playSong(song.globalIndex);
                    }}
                    class="w-full song-grid gap-4 px-4 py-3 text-left items-center rounded-md hover:bg-[var(--bg-hover)] group transition-colors text-sm cursor-pointer
                    {$currentTrack?.id === song.id
                        ? 'text-[var(--accent)] bg-white/5'
                        : 'text-[var(--text-secondary)]'}"
                    style="--desktop-cols: {desktopGridColumns};"
                >
                    <!-- Drag Handle -->
                    {#if context === "playlist"}
                        <div
                            class="cursor-grab active:cursor-grabbing text-[var(--text-muted)] hover:text-[var(--text-primary)] flex justify-center"
                            aria-label="drag-handle"
                        >
                            <GripVertical size={16} />
                        </div>
                    {/if}

                    <!-- Track # / Play Indicator -->
                    {#if isColumnVisible("track")}
                        <span
                            class="text-center text-[var(--text-muted)] group-hover:text-[var(--text-primary)] flex justify-center"
                        >
                            {#if $currentTrack?.id === song.id && $isPlaying}
                                <Music
                                    size={16}
                                    class="text-[var(--accent)] animate-pulse"
                                />
                            {:else}
                                <span class="group-hover:hidden"
                                    >{getTrackNumber(song)}</span
                                >
                                <span class="hidden group-hover:block"
                                    ><Play
                                        size={16}
                                        class="fill-[var(--text-primary)]"
                                    /></span
                                >
                            {/if}
                        </span>
                    {/if}

                    <!-- Title -->
                    <div class="flex flex-col overflow-hidden">
                        <span
                            class="font-medium truncate text-base {$currentTrack?.id ===
                            song.id
                                ? 'text-[var(--accent)]'
                                : 'text-[var(--text-primary)]'}"
                        >
                            {song.title}
                        </span>
                        <!-- Show Artist/Album on mobile if hidden from columns -->
                        <div class="flex gap-2 md:hidden">
                            <div
                                class="text-xs text-[var(--text-muted)] truncate flex items-center"
                            >
                                {#each parseArtistString(song.artist, song.artistId, song.artists) as part}
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
                            </div>
                            {#if song.album && context !== "album"}
                                <span class="text-xs text-[var(--text-muted)]"
                                    >•</span
                                >
                                <span
                                    class="text-xs text-[var(--text-muted)] truncate"
                                    >{song.album}</span
                                >
                            {/if}
                        </div>
                    </div>

                    <!-- Artist -->
                    {#if isColumnVisible("artist")}
                        <div
                            class="truncate hidden md:block text-[var(--text-secondary)] z-10 w-full"
                        >
                            {#each parseArtistString(song.artist, song.artistId, song.artists) as part}
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
                                    <span class="text-[var(--text-muted)]"
                                        >{part.name}</span
                                    >
                                {/if}
                            {/each}
                        </div>
                    {/if}

                    <!-- Album -->
                    {#if isColumnVisible("album")}
                        <a
                            href="/album/{song.albumId}"
                            class="truncate text-[var(--text-secondary)] hidden md:block hover:text-[var(--text-primary)] hover:underline z-10"
                        >
                            {song.album}
                        </a>
                    {/if}

                    <!-- Year -->
                    {#if isColumnVisible("year")}
                        <span class="text-[var(--text-muted)] hidden md:block"
                            >{song.year || "-"}</span
                        >
                    {/if}

                    <!-- Quality -->
                    {#if isColumnVisible("quality")}
                        <span
                            class="text-[var(--text-muted)] text-xs font-mono hidden md:block"
                            >{formatQuality(song)}</span
                        >
                    {/if}

                    <!-- Bitrate -->
                    {#if isColumnVisible("bitrate")}
                        <span
                            class="text-[var(--text-muted)] text-xs font-mono hidden md:block"
                            >{formatBitrate(song.bitRate)}</span
                        >
                    {/if}

                    <!-- Format -->
                    {#if isColumnVisible("format")}
                        <span
                            class="text-[var(--text-muted)] uppercase text-xs hidden md:block"
                            >{song.suffix || ""}</span
                        >
                    {/if}

                    <!-- Genre -->
                    {#if isColumnVisible("genre")}
                        <span
                            class="truncate text-[var(--text-muted)] hidden md:block"
                            >{song.genre || "-"}</span
                        >
                    {/if}

                    <!-- Play Count -->
                    {#if isColumnVisible("playCount")}
                        <span
                            class="text-[var(--text-muted)] text-xs font-mono hidden md:block text-right pr-2"
                            >{song.playCount || 0}</span
                        >
                    {/if}

                    <!-- Favorite -->
                    {#if isColumnVisible("starred")}
                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                        <!-- svelte-ignore a11y_no_static_element_interactions -->
                        <div
                            onclick={(e) => toggleFavorite(song, e)}
                            class="justify-center items-center text-[var(--text-muted)] hover:text-red-500 transition-colors cursor-pointer hidden md:flex"
                        >
                            <Heart
                                size={16}
                                class={song.starred
                                    ? "text-red-500 fill-red-500"
                                    : ""}
                            />
                        </div>
                    {/if}

                    <!-- Duration -->
                    {#if isColumnVisible("duration")}
                        <span
                            class="text-[var(--text-muted)] font-mono text-right"
                            >{formatDuration(song.duration)}</span
                        >
                    {/if}

                    <!-- Options -->
                    {#if isColumnVisible("options")}
                        <div class="flex justify-end relative">
                            <button
                                class="p-1.5 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors opacity-100 md:opacity-0 group-hover:opacity-100"
                                onclick={(e) => openMenu(e, song)}
                            >
                                <MoreVertical size={16} />
                            </button>
                        </div>
                    {/if}
                </div>
            {/each}
        {/each}
    </div>

    <!-- Context Menu -->
    {#if activeMenuSongId}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
            class="fixed z-50 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg shadow-xl py-1 min-w-[180px]"
            style="top: {menuPosition.y}px; left: {menuPosition.x}px;"
            transition:scale={{ duration: 150, start: 0.95 }}
        >
            <!-- Add to Playlist -->
            <button
                class="w-full text-left px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] flex items-center gap-2"
                onclick={() =>
                    handleAddToPlaylist(
                        songs.find((s) => s.id === activeMenuSongId),
                    )}
            >
                <Plus size={16} />
                Add to Playlist
            </button>

            <!-- Remove from Playlist (Context Dependent) -->
            {#if context === "playlist"}
                <button
                    class="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-500/10 flex items-center gap-2"
                    onclick={() =>
                        handleRemoveFromPlaylist(
                            songs.find((s) => s.id === activeMenuSongId),
                        )}
                >
                    <Trash2 size={16} />
                    Remove from Playlist
                </button>
            {/if}

            <div class="h-px bg-[var(--border-secondary)] my-1 mx-2"></div>

            <!-- Go to Artist -->
            {#if activeMenuSong}
                {#if activeMenuSong.artistId}
                    <a
                        href="/artist/{activeMenuSong.artistId}"
                        class="w-full text-left px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] flex items-center gap-2"
                        onclick={closeMenu}
                    >
                        <User size={16} />
                        Go to Artist
                    </a>
                {/if}

                <!-- Go to Album -->
                {#if activeMenuSong.albumId}
                    <a
                        href="/album/{activeMenuSong.albumId}"
                        class="w-full text-left px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] flex items-center gap-2"
                        onclick={closeMenu}
                    >
                        <Album size={16} />
                        Go to Album
                    </a>
                {/if}
            {/if}
        </div>
    {/if}
</div>

<style>
    .song-grid {
        display: grid;
        grid-template-columns: 3rem 1fr auto;
    }

    @media (min-width: 768px) {
        .song-grid {
            grid-template-columns: var(--desktop-cols);
        }
    }
</style>
