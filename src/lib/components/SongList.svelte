<script>
    import {
        playQueue,
        currentTrack,
        isPlaying,
        isFavorite,
        addToQueue,
    } from "../player.js";
    import { starTrack, unstarTrack, updatePlaylist } from "../subsonic.js";
    import OptionsButton from "./OptionsButton.svelte";
    import {
        Heart,
        Clock,
        Music,
        Disc,
        Settings2,
        Check,
        Play,
        MoreVertical,
        ArrowUp,
        ArrowDown,
        Search,
    } from "lucide-svelte";
    import { slide, fade, scale } from "svelte/transition";
    import { untrack } from "svelte";
    import { parseArtistString } from "../utils/artistUtils.js";
    import { dragHandleZone, dragHandle } from "svelte-dnd-action";
    import { flip } from "svelte/animate";
    import { reorderPlaylist } from "../subsonic.js";
    import { GripVertical } from "lucide-svelte";
    import { resolve } from "$app/paths";
    import { isMobileDevice } from "$lib/utils/deviceUtils.js";

    let isDesktop = $state(!isMobileDevice());

    /** @type {{ songs?: any[], context?: 'album' | 'artist' | 'playlist' | 'showAll' | 'favorites' | 'homescreen' |
    'songs', limit?: number, contextId?: string|null, contextName?: string|null, showToolbar?: boolean, onPlaylistUpdated?: () => void }} */
    let {
        songs = $bindable([]),
        context = "playlist",
        limit = 0,
        contextId = null,
        contextName = null,
        showToolbar = true,
        onPlaylistUpdated,
    } = $props();

    // --- SORTING & FILTERING STATE ---
    let sortField = $state("original");
    let sortDirection = $state("asc");
    let localSearchQuery = $state("");

    // Core internal state tracking localized unique entries
    /** @type {any[]}**/
    let localSongs = $state([]);

    // Keep localSongs synchronized with incoming songs from props safely
    $effect(() => {
        const currentPropsSongs = songs;

        untrack(() => {
            // Map songs to local state, preserving local IDs if the real track ID at that index hasn't changed
            const updatedLocal = currentPropsSongs.map((song, index) => {
                const existing = localSongs[index];
                if (existing && existing.realId === song.id) {
                    return {
                        ...song,
                        realId: song.id,
                        id: existing.id, // Keep existing ID to avoid DND flickering
                    };
                } else {
                    return {
                        ...song,
                        realId: song.id,
                        // Guarantee absolute uniqueness across identical songs
                        id: `${song.id}_${index}_${Math.random().toString(36).substring(2, 11)}`,
                    };
                }
            });

            // Evaluate changes before assigning to prevent recursive/infinite update loops
            const structuralChanged =
                localSongs.length !== updatedLocal.length ||
                localSongs.some(
                    (s, i) =>
                        s.id !== updatedLocal[i].id ||
                        s.starred !== updatedLocal[i].starred ||
                        s.playCount !== updatedLocal[i].playCount,
                );

            if (structuralChanged) {
                localSongs = updatedLocal;
            }
        });
    });

    // Column definitions
    const ALL_COLUMNS = [
        { id: "track", label: "#", alwaysVisible: true, sortable: true },
        { id: "title", label: "Title", alwaysVisible: true, sortable: true },
        { id: "artist", label: "Artist", alwaysVisible: false, sortable: true },
        { id: "album", label: "Album", alwaysVisible: false, sortable: true },
        { id: "year", label: "Year", alwaysVisible: false, sortable: true },
        {
            id: "quality",
            label: "Quality",
            alwaysVisible: false,
            sortable: true,
        },
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
        { id: "bpm", label: "BPM", alwaysVisible: false, sortable: true },
        {
            id: "starred",
            label: "",
            icon: Heart,
            alwaysVisible: true,
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
            id: "options",
            label: "",
            icon: MoreVertical,
            alwaysVisible: true,
            sortable: false,
        },
    ];

    // --- COLUMN VISIBILITY & CUSTOMIZATION ---

    // Track manual user overrides (e.g., { album: true, genre: false })
    /** @type {Record<string, boolean>} */
    let userColumnPreferences = $state({});

    // Completely derived list of visible columns that automatically updates if device or context changes
    let visibleColumnIds = $derived(
        (() => {
            // 1. Establish the baseline columns based on device type
            let ids = isMobileDevice()
                ? ["title", "duration", "starred", "playCount", "options"]
                : [
                      "track",
                      "title",
                      "duration",
                      "starred",
                      "format",
                      "bitrate",
                      "quality",
                      "playCount",
                      "options",
                  ];

            // 2. Safely apply context-specific modifications reactively
            if (context !== "album") ids.splice(2, 0, "album");
            if (context !== "artist") ids.splice(2, 0, "artist");

            if (context === "songs" || context === "playlist") {
                ids = [...ids, "genre"];
            }

            // 3. Layer the user's manual customization choices on top
            for (const [id, isVisible] of Object.entries(
                userColumnPreferences,
            )) {
                if (isVisible && !ids.includes(id)) {
                    ids.push(id);
                } else if (!isVisible && ids.includes(id)) {
                    ids = ids.filter((c) => c !== id);
                }
            }

            return ids;
        })(),
    );

    /** @param {string} id */
    function toggleColumn(id) {
        // Toggle the preference state based on current dynamic visibility
        userColumnPreferences[id] = !visibleColumnIds.includes(id);
    }
    /** @param {string} field */
    function handleSort(field) {
        if (!ALL_COLUMNS.find((c) => c.id === field)?.sortable) return;
        if (sortField === field) {
            if (sortDirection === "asc") sortDirection = "desc";
            else {
                sortField = "original";
                sortDirection = "asc";
            }
        } else {
            sortField = field;
            sortDirection = "asc";
        }
    }

    let processedSongs = $derived(
        (() => {
            // Read from localized list
            let result = [...localSongs];

            // 1. Filter
            if (localSearchQuery.trim()) {
                const q = localSearchQuery.toLowerCase();
                result = result.filter(
                    (s) =>
                        (s.title || "").toLowerCase().includes(q) ||
                        (s.artist || "").toLowerCase().includes(q) ||
                        (s.album || "").toLowerCase().includes(q),
                );
            }

            // 2. Sort
            if (sortField !== "original") {
                result.sort((a, b) => {
                    let valA = a[sortField];
                    let valB = b[sortField];

                    if (sortField === "quality")
                        valA = (a.bitDepth || 0) + (a.samplingRate || 0);
                    if (sortField === "quality")
                        valB = (b.bitDepth || 0) + (b.samplingRate || 0);
                    if (sortField === "starred") valA = a.starred ? 1 : 0;
                    if (sortField === "starred") valB = b.starred ? 1 : 0;

                    if (typeof valA === "string") valA = valA.toLowerCase();
                    if (typeof valB === "string") valB = valB.toLowerCase();

                    if (valA < valB) return sortDirection === "asc" ? -1 : 1;
                    if (valA > valB) return sortDirection === "asc" ? 1 : -1;
                    return 0;
                });
            }

            // 3. Limit
            if (limit > 0) {
                result = result.slice(0, limit);
            }

            return result;
        })(),
    );

    let useDiscGrouping = $derived(
        context === "album" &&
            sortField === "original" &&
            !localSearchQuery &&
            processedSongs.some((s) => s.discNumber > 1),
    );

    let groupedSongs = $derived(
        useDiscGrouping
            ? processedSongs.reduce((acc, song) => {
                  const disc = song.discNumber || 1;
                  let lastGroup = acc[acc.length - 1];
                  if (!lastGroup || lastGroup.disc !== disc) {
                      lastGroup = { disc, songs: [] };
                      acc.push(lastGroup);
                  }
                  lastGroup.songs.push(song); // Keeps original object reference intact
                  return acc;
              }, [])
            : [
                  {
                      disc: 1,
                      songs: processedSongs, // Direct reference, no mapping or copying
                  },
              ],
    );

    /**
     * @param {MouseEvent} e
     * @param {any} song
     */
    function handleRowClick(e, song) {
        const target = /** @type {HTMLElement} */ (e.target);
        if (target && (target.closest("a") || target.closest("button"))) {
            return;
        }
        playSong(song);
    }

    /** @param {any} song */
    function playSong(song) {
        if (sortField !== "original" || localSearchQuery) {
            // Map items back to original schemas matching playback requirements
            const standardProcessedSongs = processedSongs.map((s) => ({
                ...s,
                id: s.realId,
            }));
            playQueue(
                standardProcessedSongs,
                processedSongs.findIndex((s) => s.id === song.id),
                {
                    type: context,
                    id: contextId || "sorted",
                    name: contextName || "Sorted List",
                },
            );
        } else {
            const standardSongs = localSongs.map((s) => ({
                ...s,
                id: s.realId,
            }));
            const gIndex = localSongs.findIndex((s) => s.id === song.id);
            const globalIndex = gIndex !== -1 ? gIndex : 0;

            playQueue(standardSongs, globalIndex, {
                type: context,
                id: contextId || "",
                name: contextName || "",
            });
        }
    }

    // --- DND HANDLERS ---
    /** @param {any} e */
    function handleDndConsider(e) {
        if (sortField === "original" && !localSearchQuery) {
            localSongs = e.detail.items;
        }
    }

    /** @param {any} e */
    async function handleDndFinalize(e) {
        if (sortField === "original" && !localSearchQuery) {
            localSongs = e.detail.items;

            // Map changes upstream to the parent components
            songs = localSongs.map((s) => {
                const { realId, id, ...rest } = s;
                return { ...rest, id: realId };
            });

            if (context === "playlist" && contextId) {
                try {
                    await reorderPlaylist(
                        contextId,
                        localSongs.map((s) => s.realId),
                    );
                    onPlaylistUpdated?.();
                } catch (err) {
                    console.error("Failed to reorder playlist:", err);
                }
            }
        }
    }

    /** @param {number} seconds */
    function formatDuration(seconds) {
        if (!seconds) return "--:--";
        const min = Math.floor(seconds / 60);
        const sec = seconds % 60;
        return `${min}:${sec.toString().padStart(2, "0")}`;
    }

    /** @param {number | undefined} bitrate */
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
        const gIndex = localSongs.findIndex((s) => s.id === song.id);
        const globalIndex = gIndex !== -1 ? gIndex : 0;

        if (
            context === "artist" ||
            context === "playlist" ||
            context === "favorites"
        ) {
            return globalIndex + 1;
        } else if (context === "homescreen") {
            return song.playCount;
        }
        return song.track || globalIndex + 1;
    }

    /**
     * @param {any} song
     * @param {Event} event
     */
    async function toggleFavorite(song, event) {
        event.stopPropagation();
        const songIndex = localSongs.findIndex((s) => s.id === song.id);
        if (songIndex === -1) return;

        const targetSong = localSongs[songIndex];
        const isStarred = !!targetSong.starred;
        try {
            if (isStarred) {
                await unstarTrack(targetSong.realId);

                // Track favoriting is global; update all local duplicates to match state
                localSongs = localSongs.map((s) =>
                    s.realId === targetSong.realId
                        ? { ...s, starred: undefined }
                        : s,
                );

                if ($currentTrack && $currentTrack.id === targetSong.realId) {
                    isFavorite.set(false);
                    currentTrack.update((t) => ({ ...t, starred: undefined }));
                }
            } else {
                await starTrack(targetSong.realId);
                const starredTime = new Date().toISOString();

                localSongs = localSongs.map((s) =>
                    s.realId === targetSong.realId
                        ? { ...s, starred: starredTime }
                        : s,
                );

                if ($currentTrack && $currentTrack.id === targetSong.realId) {
                    isFavorite.set(true);
                    currentTrack.update((t) => ({
                        ...t,
                        starred: starredTime,
                    }));
                }
            }

            // Sync up to parent array
            songs = localSongs.map((s) => {
                const { realId, id, ...rest } = s;
                return { ...rest, id: realId };
            });
        } catch (error) {
            console.error("Failed to toggle favorite:", error);
        }
    }

    // Sync external favorite changes (from player bar) across all duplicates
    $effect(() => {
        if ($currentTrack && $isFavorite !== undefined) {
            let changed = false;
            const updatedLocalSongs = localSongs.map((song) => {
                if (song.realId === $currentTrack.id) {
                    const shouldBeStarred = $isFavorite;
                    const isStarred = !!song.starred;

                    if (shouldBeStarred !== isStarred) {
                        changed = true;
                        return {
                            ...song,
                            starred: shouldBeStarred
                                ? song.starred || new Date().toISOString()
                                : undefined,
                        };
                    }
                }
                return song;
            });

            if (changed) {
                localSongs = updatedLocalSongs;
                songs = localSongs.map((s) => {
                    const { realId, id, ...rest } = s;
                    return { ...rest, id: realId };
                });
            }
        }
    });

    let showColumnSelector = $state(false);

    let containerWidth = $state(1024);
    let isMobile = $derived(containerWidth < 768);
    let isCompact = $derived(containerWidth < 1200);

    const DESKTOP_ONLY_COLUMNS = [
        "artist",
        "album",
        "year",
        "quality",
        "bitrate",
        "format",
        "genre",
        "bpm",
        "playCount",
    ];
    const COMPACT_HIDDEN_COLUMNS = [
        "year",
        "quality",
        "bitrate",
        "format",
        "bpm",
        "playCount",
        "genre",
    ];

    /** @param {string} id */
    function isColumnVisible(id) {
        if (isMobile && DESKTOP_ONLY_COLUMNS.includes(id)) return false;
        if (isCompact && COMPACT_HIDDEN_COLUMNS.includes(id)) return false;
        return visibleColumnIds.includes(id);
    }

    let desktopGridColumns = $derived(
        `
        ${context === "playlist" ? "2rem" : ""}
        ${isColumnVisible("track") ? "3rem" : ""} 
        ${isMobile ? "minmax(0, 1fr)" : "minmax(180px, 2.5fr)"}
        ${isColumnVisible("artist") ? "minmax(140px, 2fr)" : ""} 
        ${isColumnVisible("album") ? "minmax(140px, 2fr)" : ""} 
        ${isColumnVisible("year") ? "4rem" : ""} 
        ${isColumnVisible("quality") ? "6rem" : ""} 
        ${isColumnVisible("bitrate") ? "5rem" : ""} 
        ${isColumnVisible("format") ? "4rem" : ""} 
        ${isColumnVisible("genre") ? "minmax(50px, 1fr)" : ""} 
        ${isColumnVisible("playCount") ? "3.5rem" : ""} 
        ${isColumnVisible("bpm") ? "4rem" : ""}
        ${isColumnVisible("starred") ? "2rem" : ""} 
        ${isColumnVisible("duration") ? "auto" : ""}
        ${isColumnVisible("options") ? "2rem" : ""}
    `
            .replace(/\s+/g, " ")
            .trim(),
    );
</script>

<svelte:window bind:innerWidth={containerWidth} />

<div
    bind:clientWidth={containerWidth}
    class="w-full flex flex-col relative backdrop-blur-xl shadow-xl bg-[var(--bg-sidebar)]/80 rounded-xl overflow-x-auto border border-[var(--border-primary)]"
>
    {#if showToolbar}
        <div
            class="flex flex-col sm:flex-row justify-between items-center p-4 border-b border-[var(--border-primary)] gap-4"
        >
            <div class="relative w-full sm:w-64">
                <Search
                    class="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
                    size={16}
                />
                <input
                    type="text"
                    bind:value={localSearchQuery}
                    placeholder="Search Songs..."
                    class="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-full py-1.5 pl-9 pr-4 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                />
            </div>

            <button
                class="text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-2 text-xs uppercase font-bold tracking-wider transition-colors ml-auto hidden md:inline-flex"
                onclick={() => (showColumnSelector = !showColumnSelector)}
            >
                <Settings2 size={16} />
                <span>Customize</span>
            </button>
        </div>

        {#if showColumnSelector}
            <div
                transition:slide={{ duration: 200 }}
                class="absolute right-4 top-16 z-50 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg shadow-xl p-4 min-w-[200px]"
            >
                <div
                    class="text-xs font-bold text-[var(--text-secondary)] mb-2 uppercase"
                >
                    Columns
                </div>
                <div class="flex flex-col gap-2 max-h-60 overflow-y-auto">
                    {#each ALL_COLUMNS.filter((c) => !c.alwaysVisible) as col}
                        <button
                            class="flex items-center gap-2 text-sm text-left hover:bg-[var(--bg-hover)] p-2 rounded"
                            onclick={() => toggleColumn(col.id)}
                        >
                            <div
                                class="w-4 h-4 border border-[var(--border-secondary)] rounded flex items-center justify-center {isColumnVisible(
                                    col.id,
                                )
                                    ? 'bg-[var(--accent)] border-[var(--accent)]'
                                    : ''}"
                            >
                                {#if isColumnVisible(col.id)}<Check
                                        size={12}
                                        class="text-black"
                                    />{/if}
                            </div>
                            <span
                                class={isColumnVisible(col.id)
                                    ? "text-[var(--text-primary)]"
                                    : "text-[var(--text-secondary)]"}
                                >{col.label}</span
                            >
                        </button>
                    {/each}
                </div>
            </div>
        {/if}
    {/if}

    <!-- Desktop Song Header / Hide on mobile -->
    {#if isDesktop}
        <div
            class="song-grid gap-4 px-4 py-3 text-xs text-[var(--text-secondary)] border-b border-[var(--border-primary)] uppercase tracking-wider items-center font-semibold bg-[var(--bg-card)]/50 select-none"
            style="--desktop-cols: {desktopGridColumns};"
        >
            {#if context === "playlist"}<span class="text-center"></span>{/if}

            {#each ALL_COLUMNS as col}
                {#if isColumnVisible(col.id)}
                    <div
                        class="flex items-center gap-1 {col.id === 'track' ||
                        col.id === 'starred' ||
                        col.id === 'options'
                            ? 'justify-center'
                            : ''} {col.id === 'duration' ||
                        col.id === 'playCount'
                            ? 'justify-end'
                            : ''} {col.sortable
                            ? 'cursor-pointer hover:text-[var(--text-primary)]'
                            : ''}"
                        onclick={() => handleSort(col.id)}
                        role="button"
                        tabindex="0"
                        onkeydown={() => handleSort(col.id)}
                    >
                        {#if col.icon}
                            {@const Icon = col.icon}
                            <Icon size={16} />
                        {:else}
                            {col.label}
                        {/if}

                        {#if sortField === col.id}
                            {#if sortDirection === "asc"}
                                <ArrowUp
                                    size={12}
                                    class="text-[var(--accent)]"
                                />
                            {:else}
                                <ArrowDown
                                    size={12}
                                    class="text-[var(--accent)]"
                                />
                            {/if}
                        {/if}
                    </div>
                {/if}
            {/each}
        </div>
    {/if}

    <div
        class="flex flex-col"
        use:dragHandleZone={{
            items: processedSongs, // Use processedSongs for dnd to keep visual sync, but updates happen on 'songs'
            flipDurationMs: 300,
            dragDisabled:
                context !== "playlist" ||
                sortField !== "original" ||
                localSearchQuery !== "",
            dropTargetStyle: {},
        }}
        onconsider={handleDndConsider}
        onfinalize={handleDndFinalize}
    >
        {#each groupedSongs as group, groupIndex (group.disc + "-" + groupIndex)}
            {#if useDiscGrouping && groupedSongs.length > 1}
                <div
                    class="flex items-center gap-2 px-4 py-2 bg-[var(--bg-main)]/50 text-xs font-bold text-[var(--text-secondary)] uppercase border-b border-[var(--border-primary)]"
                >
                    <Disc size={14} /> <span>Disc {group.disc}</span>
                </div>
            {/if}

            {#each group.songs as song (song.id)}
                <div
                    role="button"
                    tabindex="0"
                    animate:flip={{ duration: 300 }}
                    onkeydown={(e) =>
                        (e.key === "Enter" || e.key === " ") && playSong(song)}
                    onclick={(e) => handleRowClick(e, song)}
                    class="w-full song-grid gap-4 px-4 py-2.5 text-left items-center hover:bg-[var(--bg-hover)] group transition-colors text-sm cursor-pointer border-b border-[var(--border-secondary)]/50 last:border-0
                    {$currentTrack?.id === song.realId
                        ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                        : 'text-[var(--text-secondary)]'}"
                    style="--desktop-cols: {desktopGridColumns};"
                >
                    {#if context === "playlist"}
                        <div
                            use:dragHandle
                            class="cursor-grab active:cursor-grabbing text-[var(--text-muted)] hover:text-[var(--text-primary)] flex justify-center {sortField !==
                                'original' || localSearchQuery
                                ? 'opacity-20 cursor-not-allowed'
                                : ''}"
                        >
                            <GripVertical size={16} />
                        </div>
                    {/if}

                    {#if isColumnVisible("track")}
                        <span
                            class="text-center flex justify-center text-[var(--text-muted)] w-full"
                        >
                            {#if $currentTrack?.id === song.realId && $isPlaying}
                                <Music
                                    size={16}
                                    class="text-[var(--accent)] animate-pulse"
                                />
                            {:else}
                                <span class="group-hover:hidden"
                                    >{getTrackNumber(song)}</span
                                >
                                <Play
                                    size={16}
                                    class="hidden group-hover:block fill-current"
                                />
                            {/if}
                        </span>
                    {/if}

                    <div class="flex flex-col overflow-hidden min-w-0">
                        <span
                            class="font-medium truncate text-base {$currentTrack?.id ===
                            song.realId
                                ? 'text-[var(--accent)]'
                                : 'text-[var(--text-primary)]'}"
                            >{song.title}</span
                        >

                        <div
                            class="flex gap-2 {context === 'homescreen'
                                ? ''
                                : 'md:hidden'} text-xs text-[var(--text-muted)] truncate items-center mt-0.5"
                        >
                            {#if context === "homescreen" || context !== "artist"}
                                <span class="truncate">{song.artist}</span>
                            {/if}

                            {#if (context === "artist" && isMobileDevice()) || (song.album && context !== "album" && !isMobileDevice())}
                                {#if context === "homescreen" || context !== "artist"}
                                    <span>•</span>
                                {/if}

                                <span class="truncate">{song.album}</span>
                            {/if}
                        </div>
                    </div>

                    {#if isColumnVisible("artist")}
                        <div class="truncate hidden md:block z-10">
                            <a
                                href={resolve(`/artist/${song.artistId}`)}
                                class="hover:text-[var(--text-primary)] hover:underline"
                                >{song.artist}</a
                            >
                        </div>
                    {/if}

                    {#if isColumnVisible("album")}
                        <div class="truncate hidden md:block z-10">
                            <a
                                href={resolve(`/album/${song.albumId}`)}
                                class="hover:text-[var(--text-primary)] hover:underline"
                                >{song.album}</a
                            >
                        </div>
                    {/if}

                    {#if isColumnVisible("year")}<span
                            class="hidden md:block text-[var(--text-muted)]"
                            >{song.year || "-"}</span
                        >{/if}
                    {#if isColumnVisible("quality")}<span
                            class="hidden md:block text-[var(--text-muted)] text-xs"
                            >{formatQuality(song)}</span
                        >{/if}
                    {#if isColumnVisible("bitrate")}<span
                            class="hidden md:block text-[var(--text-muted)] text-xs"
                            >{formatBitrate(song.bitRate)}</span
                        >{/if}
                    {#if isColumnVisible("format")}<span
                            class="hidden md:block text-[var(--text-muted)] text-xs uppercase"
                            >{song.suffix || ""}</span
                        >{/if}
                    {#if isColumnVisible("genre")}<span
                            class="hidden md:block text-[var(--text-muted)] truncate"
                            >{song.genre || "-"}</span
                        >{/if}
                    {#if isColumnVisible("playCount")}<span
                            class="hidden md:block text-[var(--text-muted)] text-right"
                            >{song.playCount || 0}</span
                        >{/if}
                    {#if isColumnVisible("bpm")}<span
                            class="hidden md:block text-[var(--text-muted)] text-right"
                            >{song.bpm || "-"}</span
                        >{/if}

                    {#if isColumnVisible("starred")}
                        <div class="flex justify-center">
                            <button
                                class="hover:scale-110 transition-transform"
                                onclick={(e) => toggleFavorite(song, e)}
                            >
                                <Heart
                                    size={16}
                                    class={song.starred
                                        ? "text-red-500 fill-red-500"
                                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}
                                />
                            </button>
                        </div>
                    {/if}

                    {#if isColumnVisible("duration")}
                        <span
                            class="text-right font-mono text-[var(--text-muted)]"
                            >{formatDuration(song.duration)}</span
                        >
                    {/if}

                    {#if isColumnVisible("options")}
                        <div class="flex justify-end">
                            <OptionsButton
                                item={{ ...song, id: song.realId }}
                                {context}
                                {contextId}
                                {onPlaylistUpdated}
                                className="p-1.5 opacity-100 md:opacity-0 group-hover:opacity-100"
                            />
                        </div>
                    {/if}
                </div>
            {/each}
        {/each}
    </div>
</div>

<style>
    .song-grid {
        display: grid;
        /* Use the calculated columns for ALL devices */
        grid-template-columns: var(--desktop-cols);
        gap: 0.5rem; /* Smaller gap on mobile */
        align-items: center;
    }

    @media (min-width: 768px) {
        .song-grid {
            /* Larger gap on desktop */
            gap: 1rem;
        }
    }
</style>
