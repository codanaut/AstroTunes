<script>
    import { onMount } from "svelte";
    import {
        getPlaylists,
        getPlaylist,
        deletePlaylist,
        updatePlaylist,
        createPlaylist,
        getCoverArtUrl,
        getStreamUrl,
    } from "$lib/subsonic";
    import { playQueue } from "$lib/player";
    import SongList from "$lib/components/SongList.svelte";
    import CreatePlaylistModal from "$lib/components/CreatePlaylistModal.svelte";
    import {
        ListMusic,
        Loader2,
        Play,
        Shuffle,
        ChevronLeft,
        ChevronRight,
        Plus,
        Trash2,
        Pencil,
        Check,
        Download,
        Upload,
        X,
    } from "lucide-svelte";
    import { fade } from "svelte/transition";
    import { formatDuration } from "$lib/utils/formatDuration.js";
    import { page } from "$app/stores";

    /** @type {any[]} */
    let playlists = $state([]);
    /** @type {any} */
    let selectedPlaylist = $state(null);
    /** @type {any[]} */
    let selectedPlaylistSongs = $state([]);
    let loading = $state(true);
    let loadingSongs = $state(false);
    let showCreateModal = $state(false);
    let sidebarCollapsed = $state(false);

    // Edit Header State
    let isEditingHeader = $state(false);
    let editedName = $state("");
    let editedComment = $state("");

    // Export State
    let showExportDropdown = $state(false);

    onMount(async () => {
        await loadPlaylists();
    });

    async function loadPlaylists() {
        loading = true;
        try {
            const res = await getPlaylists();
            if (res && res.playlists && res.playlists.playlist) {
                /** @type {any[]} */
                const rawPlaylists = res.playlists.playlist;

                // Sort by 'created' date descending (newest first)
                playlists = rawPlaylists.sort((a, b) => {
                    const dateB = b.created ? new Date(b.created).getTime() : 0;
                    const dateA = a.created ? new Date(a.created).getTime() : 0;
                    return dateB - dateA;
                });

                // Re-select playlist if one was selected (to update song count etc)
                if (selectedPlaylist) {
                    const found = playlists.find(
                        (p) => p.id === selectedPlaylist.id,
                    );
                    if (found) {
                        selectedPlaylist = found;
                    }
                } else {
                    const playlistId = $page.url.searchParams.get("id");
                    if (playlistId) {
                        const found = playlists.find(
                            (p) => p.id === playlistId,
                        );
                        if (found) {
                            selectPlaylist(found);
                        }
                    }
                }
            } else {
                playlists = [];
            }
        } catch (error) {
            console.error("Failed to load playlists", error);
        } finally {
            loading = false;
        }
    }

    /** @param {any} playlist */
    async function selectPlaylist(playlist) {
        selectedPlaylist = playlist;
        loadingSongs = true;
        selectedPlaylistSongs = [];
        isEditingHeader = false; // Close edit mode if changing playlist

        try {
            const res = await getPlaylist(playlist.id);
            if (res && res.playlist && res.playlist.entry) {
                selectedPlaylistSongs = res.playlist.entry;
            } else {
                selectedPlaylistSongs = [];
            }
            if (res && res.playlist) {
                selectedPlaylist = { ...selectedPlaylist, ...res.playlist };
            }
        } catch (error) {
            console.error("Failed to load playlist songs", error);
        } finally {
            loadingSongs = false;
        }
    }

    function deselectPlaylist() {
        selectedPlaylist = null;
        selectedPlaylistSongs = [];
        isEditingHeader = false;
    }

    /** @param {number} num */
    function formatNumber(num) {
        return num ? num.toLocaleString() : "0";
    }

    function handlePlay() {
        if (selectedPlaylistSongs.length > 0) {
            playQueue(selectedPlaylistSongs, 0, {
                type: "playlist",
                id: selectedPlaylist.id,
                name: selectedPlaylist.name,
            });
        }
    }

    function handleShuffle() {
        if (selectedPlaylistSongs.length > 0) {
            // Create a copy to shuffle
            const shuffled = [...selectedPlaylistSongs].sort(
                () => Math.random() - 0.5,
            );
            playQueue(shuffled, 0, {
                type: "playlist",
                id: selectedPlaylist.id,
                name: selectedPlaylist.name,
            });
        }
    }

    async function handleDelete() {
        if (
            !confirm(
                `Are you sure you want to delete playlist "${selectedPlaylist.name}"?`,
            )
        ) {
            return;
        }

        try {
            await deletePlaylist(selectedPlaylist.id);
            playlists = playlists.filter((p) => p.id !== selectedPlaylist.id);
            deselectPlaylist();
        } catch (error) {
            console.error("Failed to delete playlist", error);
            alert("Failed to delete playlist");
        }
    }

    function handleCreateSuccess() {
        loadPlaylists();
        showCreateModal = false;
    }

    // Inline Header Editing
    function startEditingHeader() {
        editedName = selectedPlaylist.name;
        editedComment = selectedPlaylist.comment || "";
        isEditingHeader = true;
    }

    async function handleSaveHeader() {
        if (!editedName.trim()) return;
        try {
            await updatePlaylist(selectedPlaylist.id, {
                name: editedName,
                comment: editedComment,
            });

            // Optimistic UI updates
            selectedPlaylist = {
                ...selectedPlaylist,
                name: editedName,
                comment: editedComment,
            };

            playlists = playlists.map((p) => {
                if (p.id === selectedPlaylist.id) {
                    return { ...p, name: editedName, comment: editedComment };
                }
                return p;
            });

            isEditingHeader = false;
        } catch (err) {
            console.error("Failed to save playlist header:", err);
            alert("Failed to save playlist details.");
        }
    }

    // Import Flow
    function triggerImport() {
        const input = document.getElementById("import-playlist-file");
        if (input) {
            input.click();
        }
    }

    /** @param {Event} event */
    async function handleImportFile(event) {
        const target = /** @type {HTMLInputElement} */ (event.target);
        if (!target || !target.files || target.files.length === 0) return;

        const file = target.files[0];
        const reader = new FileReader();

        reader.onload = async (e) => {
            const content = e.target?.result;
            if (typeof content !== "string") return;

            try {
                if (file.name.endsWith(".json")) {
                    const data = JSON.parse(content);
                    const name = data.name || file.name.replace(/\.json$/i, "");
                    /** @type {any[]} */
                    const songsArray = data.songs || [];
                    const songIds = data.songIds || songsArray.map((s) => s.id);

                    if (songIds.length === 0) {
                        alert("No songs found in the JSON file.");
                        return;
                    }

                    await createPlaylist(name, songIds);
                    alert(
                        `Successfully imported playlist "${name}" with ${songIds.length} songs!`,
                    );
                    await loadPlaylists();
                } else if (file.name.endsWith(".m3u")) {
                    const lines = content.split(/\r?\n/);
                    const songIds = [];

                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (!trimmed || trimmed.startsWith("#")) continue;

                        const idMatch = trimmed.match(/[?&]id=([^&]+)/);
                        if (idMatch && idMatch[1]) {
                            songIds.push(idMatch[1]);
                        } else {
                            if (/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
                                songIds.push(trimmed);
                            }
                        }
                    }

                    if (songIds.length === 0) {
                        alert(
                            "No valid Subsonic song IDs or stream URLs found in the M3U file.",
                        );
                        return;
                    }

                    const name = file.name.replace(/\.m3u$/i, "");
                    await createPlaylist(name, songIds);
                    alert(
                        `Successfully imported playlist "${name}" with ${songIds.length} songs!`,
                    );
                    await loadPlaylists();
                }
            } catch (err) {
                console.error("Failed to parse file", err);
                alert(
                    "Failed to parse the playlist file. Make sure it is valid.",
                );
            } finally {
                target.value = "";
            }
        };

        reader.readAsText(file);
    }

    // Export Flow
    /**
     * @param {Event} event
     */
    function toggleExportDropdown(event) {
        event.stopPropagation();
        showExportDropdown = !showExportDropdown;
    }

    /** @param {'m3u' | 'json'} format */
    function handleExport(format) {
        showExportDropdown = false;
        if (!selectedPlaylist || selectedPlaylistSongs.length === 0) return;

        let content = "";
        let filename = `${selectedPlaylist.name.replace(/[^a-zA-Z0-9-_]/g, "_")}`;

        if (format === "json") {
            const exportData = {
                name: selectedPlaylist.name,
                comment: selectedPlaylist.comment || "",
                songIds: selectedPlaylistSongs.map((s) => s.id),
                songs: selectedPlaylistSongs.map((s) => ({
                    id: s.id,
                    title: s.title,
                    artist: s.artist,
                    album: s.album,
                    duration: s.duration,
                })),
            };
            content = JSON.stringify(exportData, null, 2);
            filename += ".json";
        } else if (format === "m3u") {
            content = "#EXTM3U\n";
            content += `#PLAYLIST:${selectedPlaylist.name}\n`;
            if (selectedPlaylist.comment) {
                content += `#COMMENT:${selectedPlaylist.comment}\n`;
            }

            selectedPlaylistSongs.forEach((song) => {
                const duration = song.duration || 0;
                const artist = song.artist || "Unknown";
                const title = song.title || "Unknown";
                const streamUrl = getStreamUrl(song.id);
                content += `#EXTINF:${duration},${artist} - ${title}\n`;
                content += `${streamUrl}\n`;
            });
            filename += ".m3u";
        }

        const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
</script>

<CreatePlaylistModal
    isOpen={showCreateModal}
    onclose={() => (showCreateModal = false)}
    onsuccess={handleCreateSuccess}
/>

<div
    class="h-[calc(100%+7rem+env(safe-area-inset-bottom))] md:h-[calc(100%+8rem)] -mt-4 -mx-4 mb-[calc(-6rem-env(safe-area-inset-bottom))] md:-mt-8 md:-mx-8 md:-mb-24 flex overflow-hidden"
>
    <!-- Playlist Sidebar -->
    <!-- Hidden on mobile if playlist is selected, visible on desktop always -->
    <div
        class="w-full border-r border-[var(--border-primary)] bg-[var(--bg-sidebar)] flex-shrink-0 flex flex-col transition-all duration-200 {sidebarCollapsed
            ? 'md:w-0 md:opacity-0 overflow-hidden border-r-0'
            : 'md:w-80'} {selectedPlaylist ? 'hidden md:flex' : 'flex'}"
    >
        <div
            class="p-4 border-b border-[var(--border-primary)] flex justify-between items-center bg-[var(--bg-sidebar)] z-10"
        >
            <h2
                class="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2"
            >
                <ListMusic class="text-[var(--accent)]" />
                Playlists
            </h2>
            <div class="flex items-center gap-1">
                <button
                    class="p-2 rounded-full hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    onclick={triggerImport}
                    title="Import Playlist (JSON/M3U)"
                >
                    <Upload size={20} />
                </button>
                <button
                    class="p-2 rounded-full hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    onclick={() => (showCreateModal = true)}
                    title="Create New Playlist"
                >
                    <Plus size={20} />
                </button>
                <button
                    class="hidden md:block p-2 rounded-full hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    onclick={() => (sidebarCollapsed = true)}
                    title="Collapse Sidebar"
                >
                    <ChevronLeft size={20} />
                </button>
            </div>
        </div>

        <div
            class="flex-1 overflow-y-auto p-2 pb-36 scrollbar-thin scrollbar-thumb-[var(--border-secondary)]"
        >
            {#if loading}
                <div class="flex justify-center p-4">
                    <Loader2 class="animate-spin text-green-500" />
                </div>
            {:else if playlists.length === 0}
                <div class="text-gray-500 text-center p-4">
                    No playlists found.
                </div>
            {:else}
                <div class="flex flex-col gap-1">
                    {#each playlists as playlist}
                        <button
                            class="text-left px-4 py-3 rounded-lg hover:bg-[var(--bg-hover)] transition-colors group {selectedPlaylist?.id ===
                            playlist.id
                                ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                                : 'text-[var(--text-secondary)]'}"
                            onclick={() => selectPlaylist(playlist)}
                        >
                            <div
                                class="font-medium truncate group-hover:text-[var(--text-primary)] transition-colors"
                            >
                                {playlist.name}
                            </div>
                            <div
                                class="text-xs text-[var(--text-muted)] mt-1 flex justify-between"
                            >
                                <span
                                    >{formatNumber(playlist.songCount)} songs</span
                                >
                                <span>{formatDuration(playlist.duration)}</span>
                            </div>
                        </button>
                    {/each}
                </div>
            {/if}
        </div>
    </div>

    <!-- Main Content -->
    <!-- Hidden on mobile if NO playlist is selected, visible on desktop always -->
    <!-- CHANGED: flex-col to block, remove overflow-hidden from here and put overflow-y-auto back on this container so the whole thing scrolls -->
    <div
        class="flex-1 overflow-y-auto bg-[var(--bg-main)] scrollbar-thin scrollbar-thumb-[var(--border-secondary)] pb-36 {selectedPlaylist
            ? 'block'
            : 'hidden md:block'}"
    >
        {#if sidebarCollapsed}
            <button
                class="hidden md:flex absolute mt-2 left-4 z-40 p-2 bg-[var(--bg-sidebar)] border border-[var(--border-primary)] rounded-full text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-all shadow-md"
                onclick={() => (sidebarCollapsed = false)}
                title="Expand Sidebar"
            >
                <ChevronRight size={20} />
            </button>
        {/if}

        {#if selectedPlaylist}
            <!-- Playlist Header -->
            <!-- Back button is now sticky on mobile so it doesn't get lost -->
            <div
                class="md:hidden sticky top-0 z-20 bg-[var(--bg-main)]/95 backdrop-blur-md p-4 border-b border-[var(--border-primary)] flex items-center gap-4"
            >
                <button
                    class="p-2 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-full text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                    onclick={deselectPlaylist}
                    aria-label="Back to Playlists"
                >
                    <ChevronLeft size={24} />
                </button>
                <div class="font-bold text-lg truncate flex-1">
                    {selectedPlaylist.name}
                </div>
            </div>

            <div
                class="p-4 md:p-8 flex flex-col md:flex-row md:items-end gap-6 bg-[var(--bg-main)] relative"
            >
                <div
                    class="w-40 h-40 md:w-56 md:h-56 shadow-2xl rounded-lg bg-[var(--bg-card)] border border-[var(--border-primary)] flex items-center justify-center flex-shrink-0 mx-auto md:mx-0 mt-4 md:mt-0 overflow-hidden"
                >
                    {#if selectedPlaylistSongs && selectedPlaylistSongs.length >= 4}
                        <div
                            class="grid grid-cols-2 grid-rows-2 w-full h-full gap-px bg-[var(--border-secondary)]/50"
                        >
                            {#each selectedPlaylistSongs.slice(0, 4) as song}
                                <img
                                    src={getCoverArtUrl(
                                        song.coverArt || song.id,
                                        120,
                                    )}
                                    alt={song.title}
                                    class="w-full h-full object-cover"
                                    loading="lazy"
                                />
                            {/each}
                        </div>
                    {:else if selectedPlaylistSongs && selectedPlaylistSongs.length > 0}
                        <img
                            src={getCoverArtUrl(
                                selectedPlaylistSongs[0].coverArt ||
                                    selectedPlaylistSongs[0].id,
                                300,
                            )}
                            alt={selectedPlaylistSongs[0].title}
                            class="w-full h-full object-cover"
                        />
                    {:else}
                        <ListMusic
                            size={80}
                            class="text-[var(--text-muted)] animate-pulse"
                        />
                    {/if}
                </div>

                <div
                    class="flex flex-col gap-4 overflow-hidden flex-1 items-center md:items-start text-center md:text-left w-full"
                >
                    {#if isEditingHeader}
                        <!-- Edit Mode -->
                        <div
                            class="flex flex-col gap-3 w-full max-w-xl text-left"
                        >
                            <div class="flex flex-col gap-1">
                                <label
                                    for="edit-playlist-name"
                                    class="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]"
                                    >Playlist Name</label
                                >
                                <input
                                    type="text"
                                    id="edit-playlist-name"
                                    bind:value={editedName}
                                    class="bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md px-3 py-2 text-[var(--text-primary)] text-xl font-bold focus:outline-none focus:border-[var(--accent)] transition-colors w-full"
                                    placeholder="Name"
                                />
                            </div>
                            <div class="flex flex-col gap-1">
                                <label
                                    for="edit-playlist-description"
                                    class="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]"
                                    >Description</label
                                >
                                <textarea
                                    id="edit-playlist-description"
                                    bind:value={editedComment}
                                    rows="2"
                                    class="bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md px-3 py-2 text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent)] transition-colors w-full resize-none"
                                    placeholder="Add an optional description..."
                                ></textarea>
                            </div>
                            <div class="flex items-center gap-2 mt-1">
                                <button
                                    class="bg-[var(--accent)] text-[var(--accent-fg)] px-4 py-1.5 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer"
                                    onclick={handleSaveHeader}
                                    disabled={!editedName.trim()}
                                >
                                    <Check size={16} /> Save
                                </button>
                                <button
                                    class="bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-primary)] px-4 py-1.5 rounded-full text-sm font-semibold hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-1.5 cursor-pointer"
                                    onclick={() => {
                                        isEditingHeader = false;
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    {:else}
                        <!-- View Mode -->
                        <div class="flex flex-col w-full">
                            <span
                                class="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] hidden md:block"
                                >Playlist</span
                            >
                            <h1
                                class="text-2xl md:text-5xl font-bold text-[var(--text-primary)] truncate drop-shadow-sm leading-tight hidden md:block"
                            >
                                {selectedPlaylist.name}
                            </h1>
                            <!-- Mobile Title -->
                            <h1
                                class="text-2xl font-bold text-[var(--text-primary)] truncate drop-shadow-sm leading-tight md:hidden"
                            >
                                {selectedPlaylist.name}
                            </h1>

                            {#if selectedPlaylist.comment}
                                <p
                                    class="text-sm text-[var(--text-secondary)] mt-2 line-clamp-2 max-w-2xl"
                                >
                                    {selectedPlaylist.comment}
                                </p>
                            {/if}

                            <div
                                class="flex flex-wrap items-center justify-center md:justify-start gap-x-2 gap-y-1 text-sm text-[var(--text-secondary)] mt-2"
                            >
                                <span
                                    class="text-[var(--text-primary)] font-medium"
                                    >{selectedPlaylist.owner ||
                                        "Unknown User"}</span
                                >
                                <span class="hidden md:inline">•</span>
                                <span
                                    >{formatNumber(selectedPlaylist.songCount)} songs</span
                                >
                                <span class="hidden md:inline">•</span>
                                <span
                                    >{formatDuration(
                                        selectedPlaylist.duration,
                                    )}</span
                                >
                            </div>
                        </div>

                        <div class="flex items-center gap-3 mt-2">
                            <button
                                class="bg-[var(--accent)] text-[var(--accent-fg)] rounded-full p-3 md:p-4 hover:scale-105 transition-transform shadow-lg hover:opacity-90 flex items-center justify-center cursor-pointer"
                                onclick={handlePlay}
                                title="Play Playlist"
                            >
                                <Play size={24} class="fill-current ml-1" />
                            </button>
                            <button
                                class="bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-primary)] rounded-full p-3 md:p-4 hover:scale-105 transition-transform hover:bg-[var(--bg-hover)] flex items-center justify-center cursor-pointer"
                                onclick={handleShuffle}
                                title="Shuffle Playlist"
                            >
                                <Shuffle size={24} />
                            </button>
                            <!-- Edit Button -->
                            <button
                                class="bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-primary)] rounded-full p-3 md:p-4 hover:scale-105 transition-transform hover:bg-[var(--bg-hover)] flex items-center justify-center cursor-pointer"
                                onclick={startEditingHeader}
                                title="Edit Playlist Details"
                            >
                                <Pencil size={24} />
                            </button>

                            <!-- Export Button & Dropdown -->
                            <div class="relative">
                                <button
                                    class="bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-primary)] rounded-full p-3 md:p-4 hover:scale-105 transition-transform hover:bg-[var(--bg-hover)] flex items-center justify-center cursor-pointer"
                                    onclick={toggleExportDropdown}
                                    title="Export Playlist"
                                >
                                    <Download size={24} />
                                </button>
                                {#if showExportDropdown}
                                    <div
                                        class="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-30 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg shadow-xl py-1 min-w-[150px] overflow-hidden"
                                    >
                                        <button
                                            class="w-full text-left px-4 py-2 hover:bg-[var(--bg-hover)] text-sm text-[var(--text-primary)] transition-colors cursor-pointer"
                                            onclick={() => handleExport("m3u")}
                                        >
                                            Export as M3U
                                        </button>
                                        <button
                                            class="w-full text-left px-4 py-2 hover:bg-[var(--bg-hover)] text-sm text-[var(--text-primary)] transition-colors cursor-pointer"
                                            onclick={() => handleExport("json")}
                                        >
                                            Export as JSON
                                        </button>
                                    </div>
                                {/if}
                            </div>

                            <div class="flex-1 md:hidden"></div>

                            <button
                                class="bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-primary)] rounded-full p-3 md:p-4 hover:scale-105 transition-transform hover:bg-[var(--bg-hover)] hover:text-red-500 hover:border-red-500 flex items-center justify-center cursor-pointer"
                                onclick={handleDelete}
                                title="Delete Playlist"
                            >
                                <Trash2 size={24} />
                            </button>
                        </div>
                    {/if}
                </div>
            </div>

            <!-- Song List -->
            <!-- Removed overflow-y-auto here so it flows naturally -->
            <div>
                {#if loadingSongs}
                    <div class="h-40 flex items-center justify-center">
                        <Loader2
                            class="animate-spin text-[var(--accent)]"
                            size={32}
                        />
                    </div>
                {:else if selectedPlaylistSongs.length === 0}
                    <div class="p-8 text-gray-500 text-center">
                        This playlist is empty.
                    </div>
                {:else}
                    <SongList
                        songs={selectedPlaylistSongs}
                        context="playlist"
                        contextId={selectedPlaylist.id}
                        contextName={selectedPlaylist.name}
                        onPlaylistUpdated={() =>
                            selectPlaylist(selectedPlaylist)}
                    />
                {/if}
            </div>
        {:else}
            <!-- Empty State -->
            <div
                class="flex-1 flex flex-col items-center justify-center text-[var(--text-muted)] min-h-[50vh]"
            >
                <ListMusic size={64} class="mb-4 opacity-50" />
                <p class="text-lg">Select a playlist to view songs</p>
                <button
                    class="mt-4 text-[var(--accent)] hover:underline"
                    onclick={() => (showCreateModal = true)}
                >
                    Create New Playlist
                </button>
            </div>
        {/if}
    </div>
</div>

<svelte:window onclick={() => (showExportDropdown = false)} />

<input
    type="file"
    id="import-playlist-file"
    accept=".m3u,.json"
    class="hidden"
    onchange={handleImportFile}
/>
