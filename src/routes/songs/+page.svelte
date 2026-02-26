<script>
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";
    import { subsonicFetch } from "../../lib/subsonic.js";
    import { ChevronLeft, ChevronRight, Music } from "lucide-svelte";
    import { resolve } from "$app/paths";
    import SongList from "../../lib/components/SongList.svelte";
    import {
        libraryStore,
        musicFolderParam,
    } from "../../lib/stores/library.js";
    import { untrack } from "svelte";

    /** @type {any[]} */
    let songs = $state([]);
    let loading = $state(true);
    let totalSongs = $state(0);
    const limit = 50;

    let currentPage = $derived(Number($page.url.searchParams.get("page")) || 1);
    let offset = $derived((currentPage - 1) * limit);

    /**
     * @param {number} pageOffset
     * @param {string} folderParam
     */
    async function loadSongs(pageOffset, folderParam) {
        loading = true;
        try {
            // search3 supports musicFolderId
            const result = await subsonicFetch(
                "search3",
                `&query=&songOffset=${pageOffset}&songCount=${limit}&artistCount=0&albumCount=0${folderParam}`,
            );
            if (result && result.searchResult3) {
                if (result.searchResult3.song) {
                    songs = result.searchResult3.song;
                } else {
                    songs = [];
                }
                if (result.searchResult3.totalHits !== undefined) {
                    totalSongs = result.searchResult3.totalHits;
                }
            } else {
                songs = [];
            }
        } catch (e) {
            console.error("Error loading songs:", e);
        } finally {
            loading = false;
        }
    }

    $effect(() => {
        const pageOffset = offset;
        const folderParam = musicFolderParam($libraryStore.selectedId);
        untrack(() => loadSongs(pageOffset, folderParam));
    });

    function nextPage() {
        goto(resolve(`/songs`) + `?page=${currentPage + 1}`);
    }

    function prevPage() {
        if (currentPage > 1) {
            goto(resolve(`/songs`) + `?page=${currentPage - 1}`);
        }
    }
</script>

<div class="w-full mx-auto p-4 md:p-8 pb-32">
    <div
        class="flex flex-col md:flex-row items-center justify-between mb-6 gap-4"
    >
        <div class="flex items-center gap-2">
            <h1 class="text-3xl font-bold text-[var(--text-primary)]">
                Library Songs
            </h1>
            {#if totalSongs > 0}
                <span
                    class="text-[var(--text-muted)] text-sm font-normal self-end mb-1 ml-2"
                >
                    {totalSongs} tracks
                </span>
            {/if}
        </div>

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
            <span class="text-sm font-mono text-[var(--text-secondary)] px-2">
                {#if totalSongs > 0}
                    {offset + 1}-{Math.min(offset + limit, totalSongs)}
                    <span class="text-[var(--text-muted)]">/</span>
                    {totalSongs}
                {:else}
                    Page {currentPage}
                {/if}
            </span>
            <button
                onclick={nextPage}
                disabled={songs.length < limit}
                class="p-2 rounded-md hover:bg-[var(--bg-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-[var(--text-primary)]"
                title="Next Page"
            >
                <ChevronRight size={20} />
            </button>
        </div>
    </div>

    {#if loading}
        <div class="flex justify-center items-center h-64">
            <div
                class="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]"
            ></div>
        </div>
    {:else if songs.length === 0}
        <div
            class="flex flex-col items-center justify-center py-20 text-[var(--text-muted)] border border-dashed border-[var(--border-primary)] rounded-xl bg-[var(--bg-card)]/50"
        >
            <Music size={48} class="mb-4 opacity-50" />
            <p class="text-lg">No songs found in library.</p>
        </div>
    {:else}
        <SongList
            {songs}
            context="songs"
            contextId="library"
            contextName={`Library (Page ${currentPage})`}
        />

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
                disabled={songs.length < limit}
                class="px-4 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
                Next
            </button>
        </div>
    {/if}
</div>
