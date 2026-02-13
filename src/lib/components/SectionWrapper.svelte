<script>
    import { onMount } from "svelte";
    import { browser } from "$app/environment";
    import { LayoutGrid, List, ChevronLeft, ChevronRight } from "lucide-svelte";
    import AlbumCard from "./AlbumCard.svelte";
    import ArtistCard from "./ArtistCard.svelte";
    import AlbumList from "./AlbumList.svelte";
    import ArtistList from "./ArtistList.svelte";
    import ShowAllButton from "./ShowAllButton.svelte";
    import { goto } from "$app/navigation";
    import FeaturedLayout from "./layouts/FeaturedLayout.svelte";
    import StandardGrid from "./layouts/StandardGrid.svelte";
    import ListLayout from "./layouts/ListLayout.svelte";

    /** @type {'standard' | 'featured'} */
    export let layout = "standard";

    export let title = "";
    /** @type {any[]} */
    export let items = [];
    /** @type {'album' | 'artist'} */
    export let type = "album";
    /** @type {string | null} */
    export let showAllLink = null;

    // Pagination props
    /** @type {number} */
    export let totalItems = 0;
    /** @type {number} */
    export let currentPage = 1;
    /** @type {number} */
    export let limit = 50;
    /** @type {string} */
    export let baseUrl = ""; // Base URL for pagination navigation (e.g. /albums)
    export let enableViewToggle = true;
    export let headerClass = "";

    // View State
    let viewMode = "grid";
    const storageKey = `section-view-mode-${type}`;

    onMount(() => {
        if (browser && enableViewToggle) {
            const saved = localStorage.getItem(storageKey);
            if (saved === "grid" || saved === "list") {
                viewMode = saved;
            }
        }
    });

    /**
     * @param {'grid' | 'list'} mode
     */
    function setViewMode(mode) {
        viewMode = mode;
        if (browser && enableViewToggle) {
            localStorage.setItem(storageKey, mode);
        }
    }

    function nextPage() {
        if (!baseUrl) return;
        const url = new URL(baseUrl, window.location.origin);
        url.searchParams.set("page", String(currentPage + 1));
        goto(url.pathname + url.search);
    }

    function prevPage() {
        if (!baseUrl || currentPage <= 1) return;
        const url = new URL(baseUrl, window.location.origin);
        url.searchParams.set("page", String(currentPage - 1));
        goto(url.pathname + url.search);
    }

    $: totalPages = Math.ceil(totalItems / limit);
</script>

<div
    class="mb-6 mt-6 p-4 backdrop-blur-xl shadow-xl bg-[var(--bg-sidebar)]/80 rounded-xl"
>
    <div
        class="flex flex-col md:flex-row items-center justify-between mb-4 gap-4 {headerClass}"
    >
        <h1 class="text-2xl font-bold text-[var(--accent)]">
            {#if showAllLink}
                <a href={showAllLink}>{title}</a>
            {:else}
                {title}
            {/if}
            {#if totalItems > 0 && !showAllLink}
                <span
                    class="text-[var(--text-secondary)] text-lg ml-2 font-normal"
                    >- {totalItems}</span
                >
            {/if}
        </h1>

        <div class="flex items-center gap-4">
            <!-- View Toggles -->
            {#if enableViewToggle}
                <div
                    class="flex bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg p-1"
                >
                    <button
                        class="p-2 rounded-md transition-colors {viewMode ===
                        'grid'
                            ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}"
                        on:click={() => setViewMode("grid")}
                        aria-label="Grid View"
                    >
                        <LayoutGrid size={20} />
                    </button>
                    <button
                        class="p-2 rounded-md transition-colors {viewMode ===
                        'list'
                            ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}"
                        on:click={() => setViewMode("list")}
                        aria-label="List View"
                    >
                        <List size={20} />
                    </button>
                </div>
            {/if}

            <!-- Pagination or Show All -->
            {#if showAllLink}
                <ShowAllButton href={showAllLink} label="Show All" />
            {:else if baseUrl}
                <div class="flex gap-2 items-center">
                    <button
                        on:click={prevPage}
                        disabled={currentPage === 1}
                        class="p-2 rounded-full bg-[var(--bg-card)] border border-[var(--border-primary)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <span
                        class="text-sm text-[var(--text-secondary)] whitespace-nowrap hidden sm:inline"
                    >
                        {#if totalItems > 0}
                            Page {currentPage} of {totalPages}
                        {:else}
                            Page {currentPage}
                        {/if}
                    </span>
                    <button
                        on:click={nextPage}
                        disabled={totalItems > 0
                            ? currentPage >= totalPages
                            : items.length < limit}
                        class="p-2 rounded-full bg-[var(--bg-card)] border border-[var(--border-primary)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            {/if}
        </div>
    </div>

    <!-- Content -->
    {#if items.length === 0}
        <div class="text-center text-[var(--text-muted)] py-12">
            No items found.
        </div>
    {:else if layout === "featured"}
        <FeaturedLayout {items} />
    {:else if viewMode === "grid"}
        <StandardGrid {items} {type} />
    {:else}
        <ListLayout {items} {type} />
    {/if}

    {#if !showAllLink && totalItems > 0 && baseUrl}
        <div class="flex justify-center gap-2 mt-8">
            <button
                on:click={prevPage}
                disabled={currentPage === 1}
                class="p-2 rounded-full bg-[var(--bg-card)] border border-[var(--border-primary)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                <ChevronLeft size={20} />
            </button>
            <span
                class="flex items-center px-2 text-[var(--text-secondary)] text-sm"
            >
                Page {currentPage} of {totalPages}
            </span>
            <button
                on:click={nextPage}
                disabled={currentPage >= totalPages}
                class="p-2 rounded-full bg-[var(--bg-card)] border border-[var(--border-primary)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                <ChevronRight size={20} />
            </button>
        </div>
    {/if}

    <!-- Bottom Pagination (if paginated) -->
    {#if !showAllLink && totalItems > 0 && baseUrl}
        <div class="flex justify-center gap-2 mt-8">
            <button
                on:click={prevPage}
                disabled={currentPage === 1}
                class="p-2 rounded-full bg-[var(--bg-card)] border border-[var(--border-primary)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                <ChevronLeft size={20} />
            </button>
            <span
                class="flex items-center px-2 text-[var(--text-secondary)] text-sm"
            >
                Page {currentPage} of {totalPages}
            </span>
            <button
                on:click={nextPage}
                disabled={currentPage >= totalPages}
                class="p-2 rounded-full bg-[var(--bg-card)] border border-[var(--border-primary)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                <ChevronRight size={20} />
            </button>
        </div>
    {/if}
</div>
