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

    import { parseArtistString } from "../utils/artistUtils.js";
    import { dndzone } from "svelte-dnd-action";
    import { flip } from "svelte/animate";
    import { reorderPlaylist } from "../subsonic.js";
    import { GripVertical } from "lucide-svelte";
    import { resolve } from "$app/paths";
    import { isMobileDevice } from "$lib/utils/deviceUtils.js";

    /** @type {{ songs?: any[], context?: 'album' | 'artist' | 'playlist' | 'showAll' | 'favorites' | 'songs', limit?: number, contextId?: string|null, contextName?: string|null, showToolbar?: boolean, onPlaylistUpdated?: () => void }} */
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
    let sortField = $state("original"); // 'original' means no sorting (respects track order/server order)
    let sortDirection = $state("asc");
    let localSearchQuery = $state("");

    // Column definitions
    // Columns Configuration
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

    // Default Visible Columns
    // Determine default visible columns based on device type
    /**
     * @type {string[]}
     */
    let visibleColumnIds = [];
    if (isMobileDevice()) {
        visibleColumnIds = [
            "track",
            "title",
            "duration",
            "starred",
            "playCount",
            "options",
        ];
    } else {
        visibleColumnIds = [
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
    }

    // Add context-specific columns
    if (context !== "album") visibleColumnIds.splice(2, 0, "album");
    if (context !== "artist") visibleColumnIds.splice(2, 0, "artist");
    // Add extra details for the big lists
    if (context === "songs" || context === "playlist") {
        visibleColumnIds = [...visibleColumnIds, "genre"];
    }

    // --- SORT & FILTER LOGIC ---
    /** @param {string} field */
    function handleSort(field) {
        if (!ALL_COLUMNS.find((c) => c.id === field)?.sortable) return;

        if (sortField === field) {
            // Cycle: asc -> desc -> original
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
            let result = [...songs];

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

                    // Handle specific cases
                    if (sortField === "quality")
                        valA = (a.bitDepth || 0) + (a.samplingRate || 0);
                    if (sortField === "quality")
                        valB = (b.bitDepth || 0) + (b.samplingRate || 0);
                    if (sortField === "starred") valA = a.starred ? 1 : 0;
                    if (sortField === "starred") valB = b.starred ? 1 : 0;

                    // String comparison
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

    // Only group by disc if we are in Album context AND NOT sorting/searching
    let useDiscGrouping = $derived(
        context === "album" &&
            sortField === "original" &&
            !localSearchQuery &&
            processedSongs.some((s) => s.discNumber > 1),
    );

    let groupedSongs = $derived(
        useDiscGrouping
            ? processedSongs.reduce((acc, song, index) => {
                  // Preserve original global index for playback context
                  const originalIndex = songs.findIndex(
                      (s) => s.id === song.id,
                  );
                  song.globalIndex =
                      originalIndex !== -1 ? originalIndex : index;

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
                      songs: processedSongs.map((s, i) => {
                          const originalIndex = songs.findIndex(
                              (raw) => raw.id === s.id,
                          );
                          return {
                              ...s,
                              globalIndex:
                                  originalIndex !== -1 ? originalIndex : i,
                          };
                      }),
                  },
              ],
    );

    /**
     * Handles row clicks safely, ignoring clicks on interactive elements like buttons/links
     * @param {MouseEvent} e
     * @param {any} song
     */
    function handleRowClick(e, song) {
        // Safe cast: assert that target is an HTMLElement so we can use .closest()
        const target = /** @type {HTMLElement} */ (e.target);

        // If the click was on a button or link (or their children), do nothing
        if (target && (target.closest("a") || target.closest("button"))) {
            return;
        }

        playSong(song);
    }

    // --- PLAYBACK & ACTIONS ---
    /** @param {any} song */
    function playSong(song) {
        // We pass the FULL original list to the player, but start at the clicked song's index
        // If sorting is active, the queue experience might feel jumpy if we play the 'sorted' index against the 'original' list.
        // Better UX: Play the filtered/sorted view as a *new* ad-hoc queue.

        if (sortField !== "original" || localSearchQuery) {
            // Play the VISIBLE list
            playQueue(
                processedSongs,
                processedSongs.findIndex((s) => s.id === song.id),
                {
                    type: context,
                    id: contextId || "sorted",
                    name: contextName || "Sorted List",
                },
            );
        } else {
            // Play the original context
            playQueue(songs, song.globalIndex, {
                type: context,
                // Fixed: Ensure string types
                id: contextId || "",
                name: contextName || "",
            });
        }
    }

    // --- DND HANDLERS (Disable when sorted) ---
    /** @param {any} e */
    function handleDndConsider(e) {
        if (sortField === "original" && !localSearchQuery)
            songs = e.detail.items;
    }
    /** @param {any} e */
    async function handleDndFinalize(e) {
        if (sortField === "original" && !localSearchQuery) {
            songs = e.detail.items;
            if (context === "playlist" && contextId) {
                try {
                    await reorderPlaylist(
                        contextId,
                        songs.map((s) => s.id),
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
    $effect(() => {
        if ($currentTrack && $isFavorite !== undefined) {
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
    });

    let showColumnSelector = $state(false);

    /** @param {string} id */
    function toggleColumn(id) {
        if (visibleColumnIds.includes(id)) {
            visibleColumnIds = visibleColumnIds.filter((c) => c !== id);
        } else {
            visibleColumnIds = [...visibleColumnIds, id];
        }
    }

    let containerWidth = $state(1024); // Default to wide to prevent flash

    // If the container (not the window) is smaller than 768px, switch to mobile view
    let isMobile = $derived(containerWidth < 768);

    // Tablet/Compact view (< 1200px) - Triggers when queue is open on laptops
    let isCompact = $derived(containerWidth < 1200);

    // 2. Define columns that should NEVER show on mobile (even if enabled)
    // Note: We hide 'artist' and 'album' here because they are shown under the Title on mobile
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

    // Columns hidden on Compact Desktop (when queue is open)
    const COMPACT_HIDDEN_COLUMNS = [
        "year",
        "quality",
        "bitrate",
        "format",
        "bpm",
        "playCount",
        "genre",
    ];

    // 3. Smart Visibility Check
    // This overrides the settings: if on mobile, force-hide the heavy columns
    /** @param {string} id */
    function isColumnVisible(id) {
        // Force hide on mobile
        if (isMobile && DESKTOP_ONLY_COLUMNS.includes(id)) return false;

        // Force hide on compact/tablet (unless it's the specific context, e.g. don't hide artist if sorting by artist)
        if (isCompact && COMPACT_HIDDEN_COLUMNS.includes(id)) return false;

        return visibleColumnIds.includes(id);
    }

    // 4. Grid Generation
    let desktopGridColumns = $derived(
        `
        ${context === "playlist" ? "2rem" : ""}
        ${isColumnVisible("track") ? "3rem" : ""} 
        
        /* Title: 1fr on Mobile (fills space), 2.5fr on Desktop */
        ${isMobile ? "minmax(0, 1fr)" : "minmax(180px, 2.5fr)"}
        
        /* Since isColumnVisible returns false on mobile for these, they effectively vanish from the grid definition */
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
                class="text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-2 text-xs uppercase font-bold tracking-wider transition-colors ml-auto"
                onclick={() => (showColumnSelector = !showColumnSelector)}
            >
                <Settings2 size={16} />
                <span class="hidden sm:inline">Customize</span>
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
                        : ''} {col.id === 'duration' || col.id === 'playCount'
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
                            <ArrowUp size={12} class="text-[var(--accent)]" />
                        {:else}
                            <ArrowDown size={12} class="text-[var(--accent)]" />
                        {/if}
                    {/if}
                </div>
            {/if}
        {/each}
    </div>

    <div
        class="flex flex-col"
        use:dndzone={{
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
        {#each groupedSongs as group (group.disc)}
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
                    {$currentTrack?.id === song.id
                        ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                        : 'text-[var(--text-secondary)]'}"
                    style="--desktop-cols: {desktopGridColumns};"
                >
                    {#if context === "playlist"}
                        <div
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
                            {#if $currentTrack?.id === song.id && $isPlaying}
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
                            song.id
                                ? 'text-[var(--accent)]'
                                : 'text-[var(--text-primary)]'}"
                            >{song.title}</span
                        >

                        <div
                            class="flex gap-2 md:hidden text-xs text-[var(--text-muted)] truncate items-center mt-0.5"
                        >
                            <span class="truncate">{song.artist}</span>
                            {#if song.album && context !== "album"}
                                <span>•</span>
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
                                item={song}
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
