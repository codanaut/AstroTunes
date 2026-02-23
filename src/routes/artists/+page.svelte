<script>
    import { onMount } from "svelte";
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";
    import { getAllArtists } from "../../lib/subsonic.js";
    import ArtistList from "../../lib/components/ArtistList.svelte";
    import ArtistCard from "../../lib/components/ArtistCard.svelte";
    import {
        Mic2,
        ChevronLeft,
        ChevronRight,
        LayoutGrid,
        List,
    } from "lucide-svelte";
    import { resolve } from "$app/paths";
    import { browser } from "$app/environment";

    /** @type {any[]} */
    let allArtists = $state([]);
    /** @type {any[]} */
    let displayedArtists = $state([]);
    let loading = $state(true);
    const limit = 50;
    const baseUrl = "/artists";

    let viewMode = $state("grid");
    const storageKey = "section-view-mode-artist";

    let currentPage = $derived(Number($page.url.searchParams.get("page")) || 1);
    let offset = $derived((currentPage - 1) * limit);

    onMount(async () => {
        if (browser) {
            const saved = localStorage.getItem(storageKey);
            if (saved === "grid" || saved === "list") {
                viewMode = saved;
            }
        }
        await loadArtists();
    });

    function setViewMode(mode) {
        viewMode = mode;
        if (browser) {
            localStorage.setItem(storageKey, mode);
        }
    }

    // When allArtists or currentPage changes, update displayedArtists
    $effect(() => {
        displayedArtists = allArtists.slice(offset, offset + limit);
    });

    async function loadArtists() {
        loading = true;
        try {
            const data = await getAllArtists();
            if (data && data.artists && data.artists.index) {
                allArtists = data.artists.index
                    .flatMap(
                        (/** @type {any} */ letterGroup) =>
                            letterGroup.artist || [],
                    )
                    .filter(
                        (/** @type {any} */ artist) => artist.albumCount > 0,
                    );
            } else {
                allArtists = [];
            }
        } catch (e) {
            console.error("Error loading artists:", e);
        } finally {
            loading = false;
        }
    }

    function nextPage() {
        if (offset + limit < allArtists.length) {
            goto(resolve(baseUrl) + `?page=${currentPage + 1}`);
        }
    }

    function prevPage() {
        if (currentPage > 1) {
            goto(resolve(baseUrl) + `?page=${currentPage - 1}`);
        }
    }

    let totalArtists = $derived(allArtists.length);
</script>

<div class="w-full mx-auto p-4 md:p-8 pb-32">
    <!-- Header Controls -->
    <div
        class="flex flex-col md:flex-row items-center justify-between mb-6 gap-4"
    >
        <div class="flex items-center gap-2">
            <h1 class="text-3xl font-bold text-[var(--text-primary)]">
                Artists
            </h1>
            {#if totalArtists > 0}
                <span
                    class="text-[var(--text-muted)] text-sm font-normal self-end mb-1 ml-2"
                >
                    {totalArtists} artists
                </span>
            {/if}
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
                    {#if totalArtists > 0}
                        {offset + 1}-{Math.min(offset + limit, totalArtists)}
                        <span class="text-[var(--text-muted)]">/</span>
                        {totalArtists}
                    {:else}
                        Page {currentPage}
                    {/if}
                </span>
                <button
                    onclick={nextPage}
                    disabled={displayedArtists.length < limit ||
                        offset + limit >= totalArtists}
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
    {:else if displayedArtists.length === 0}
        <div
            class="flex flex-col items-center justify-center py-20 text-[var(--text-muted)] border border-dashed border-[var(--border-primary)] rounded-xl bg-[var(--bg-card)]/50"
        >
            <Mic2 size={48} class="mb-4 opacity-50" />
            <p class="text-lg">No artists found.</p>
        </div>
    {:else}
        {#if viewMode === "grid"}
            <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {#each displayedArtists as artist (artist.id)}
                    <ArtistCard {artist} />
                {/each}
            </div>
        {:else}
            <ArtistList artists={displayedArtists} />
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
                disabled={displayedArtists.length < limit ||
                    offset + limit >= totalArtists}
                class="px-4 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
                Next
            </button>
        </div>
    {/if}
</div>
