<script>
    import { onMount, onDestroy } from "svelte";
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";
    import { getAlbums } from "../../../lib/subsonic.js";
    import AlbumList from "../../../lib/components/AlbumList.svelte";
    import AlbumCard from "../../../lib/components/AlbumCard.svelte";
    import BackButton from "../../../lib/components/BackButton.svelte";
    import {
        Disc,
        ChevronLeft,
        ChevronRight,
        LayoutGrid,
        List,
    } from "lucide-svelte";
    import { resolve } from "$app/paths";
    import { browser } from "$app/environment";
    import {
        libraryStore,
        musicFolderParam,
    } from "../../../lib/stores/library.js";
    import { untrack } from "svelte";

    /** @type {any[]} */
    let albums = $state([]);
    let loading = $state(true);
    const limit = 50;
    const baseUrl = "/albums/recent";
    const totalItems = 500; // Cap for recent albums

    /** @type {any} */
    let syncInterval;

    let viewMode = $state("grid");
    const storageKey = "section-view-mode-album";

    let currentPage = $derived(Number($page.url.searchParams.get("page")) || 1);
    let offset = $derived((currentPage - 1) * limit);

    onMount(() => {
        if (browser) {
            const saved = localStorage.getItem(storageKey);
            if (saved === "grid" || saved === "list") {
                viewMode = saved;
            }
        }
        startSyncLoop();
    });

    onDestroy(() => {
        if (syncInterval) clearInterval(syncInterval);
    });

    /** @param {'grid' | 'list'} mode */
    function setViewMode(mode) {
        viewMode = mode;
        if (browser) {
            localStorage.setItem(storageKey, mode);
        }
    }

    /**
     * @param {boolean} silent
     * @param {string} folderParam
     */
    async function loadAlbums(silent = false, folderParam = "") {
        if (!silent) loading = true;
        try {
            const albumsData = await getAlbums(offset, limit, "newest", folderParam);

            if (
                albumsData &&
                albumsData.albumList &&
                albumsData.albumList.album
            ) {
                albums = albumsData.albumList.album;
            } else {
                albums = [];
            }
        } catch (e) {
            console.error("Error loading albums:", e);
        } finally {
            if (!silent) loading = false;
        }
    }

    function startSyncLoop() {
        if (syncInterval) clearInterval(syncInterval);
        syncInterval = setInterval(() => {
            const folderParam = musicFolderParam(get(libraryStore).selectedId);
            loadAlbums(true, folderParam);
        }, 10000);
    }

    $effect(() => {
        if (currentPage) {
            const folderParam = musicFolderParam($libraryStore.selectedId);
            untrack(() => loadAlbums(false, folderParam));
        }
    });

    function nextPage() {
        goto(resolve(baseUrl) + `?page=${currentPage + 1}`);
    }

    function prevPage() {
        if (currentPage > 1) {
            goto(resolve(baseUrl) + `?page=${currentPage - 1}`);
        }
    }
</script>

<div class="w-full mx-auto p-4 md:p-8 pb-32">
    <BackButton />

    <!-- Header Controls -->
    <div
        class="flex flex-col md:flex-row items-center justify-between mb-6 gap-4"
    >
        <div class="flex items-center gap-3">
            <div
                class="p-3 bg-[var(--bg-card)] rounded-full text-[var(--accent)] border border-[var(--border-primary)]"
            >
                <Disc size={24} />
            </div>
            <h1 class="text-3xl font-bold text-[var(--text-primary)]">
                Recently Added Albums
            </h1>
        </div>

        <div class="flex items-center gap-4">
            <!-- View Toggles -->
            <div
                class="flex bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg p-1"
            >
                <button
                    class="p-2 rounded-md transition-colors {viewMode === 'grid'
                        ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}"
                    onclick={() => setViewMode("grid")}
                    aria-label="Grid View"
                >
                    <LayoutGrid size={20} />
                </button>
                <button
                    class="p-2 rounded-md transition-colors {viewMode === 'list'
                        ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}"
                    onclick={() => setViewMode("list")}
                    aria-label="List View"
                >
                    <List size={20} />
                </button>
            </div>

            <!-- Pagination Controls -->
            <div
                class="flex gap-2 items-center bg-[var(--bg-card)] p-1 rounded-lg border border-[var(--border-primary)]"
            >
                <button
                    onclick={prevPage}
                    disabled={currentPage === 1}
                    class="p-2 rounded-md hover:bg-[var(--bg-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-[var(--text-primary)]"
                    title="Previous Page"
                >
                    <ChevronLeft size={20} />
                </button>
                <span
                    class="text-sm font-mono text-[var(--text-secondary)] px-2"
                >
                    {offset + 1}-{Math.min(offset + limit, totalItems)}
                </span>
                <button
                    onclick={nextPage}
                    disabled={albums.length < limit ||
                        offset + limit >= totalItems}
                    class="p-2 rounded-md hover:bg-[var(--bg-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-[var(--text-primary)]"
                    title="Next Page"
                >
                    <ChevronRight size={20} />
                </button>
            </div>
        </div>
    </div>

    {#if loading}
        <div class="flex justify-center items-center h-64">
            <div
                class="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]"
            ></div>
        </div>
    {:else if albums.length === 0}
        <div
            class="flex flex-col items-center justify-center py-20 text-[var(--text-muted)] border border-dashed border-[var(--border-primary)] rounded-xl bg-[var(--bg-card)]/50"
        >
            <Disc size={48} class="mb-4 opacity-50" />
            <p class="text-lg">No albums found.</p>
        </div>
    {:else}
        {#if viewMode === "grid"}
            <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {#each albums as album (album.id)}
                    <AlbumCard {album} />
                {/each}
            </div>
        {:else}
            <AlbumList {albums} />
        {/if}

        <!-- Bottom Pagination -->
        <div class="flex justify-center gap-2 mt-8">
            <button
                onclick={prevPage}
                disabled={currentPage === 1}
                class="px-4 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
                Previous
            </button>
            <button
                onclick={nextPage}
                disabled={albums.length < limit || offset + limit >= totalItems}
                class="px-4 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
                Next
            </button>
        </div>
    {/if}
</div>
