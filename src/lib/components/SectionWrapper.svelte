<script>
    import { onMount } from "svelte";
    import { browser } from "$app/environment";
    import { LayoutGrid, List, ChevronLeft, ChevronRight } from "lucide-svelte";
    import ShowAllButton from "./ShowAllButton.svelte";
    import { goto } from "$app/navigation";
    import FeaturedLayout from "./layouts/FeaturedLayout.svelte";
    import StandardGrid from "./layouts/StandardGrid.svelte";
    import ListLayout from "./layouts/ListLayout.svelte";
    import { resolve } from "$app/paths";

    let {
        layout = "standard",
        title = "",
        items = [],
        type = "album",
        showAllLink = null,
        totalItems = 0,
        currentPage = 1,
        limit = 50,
        baseUrl = "",
        enableViewToggle = true,
        headerClass = "",
    } = $props();

    // View State
    let viewMode = $state("grid");
    const storageKey = $derived(`section-view-mode-${type}`);

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
        const resolveRoute = /** @type {any} */ (resolve);
        const url = new URL(resolve(resolveRoute), window.location.origin);
        url.searchParams.set("page", String(currentPage + 1));
        goto(url.pathname + url.search);
    }

    function prevPage() {
        if (!baseUrl || currentPage <= 1) return;
        const resolveRoute = /** @type {any} */ (resolve);
        const url = new URL(resolve(resolveRoute), window.location.origin);
        url.searchParams.set("page", String(currentPage - 1));
        goto(url.pathname + url.search);
    }

    let totalPages = $derived(Math.ceil(totalItems / limit));
</script>

<div class="mt-12 mb-6">
    <div
        class="flex flex-col md:flex-row items-center justify-between mb-4 gap-4 {headerClass}"
    >
        <div class="flex items-center gap-2">
            <h1 class="text-2xl font-bold text-[var(--text-primary)]">
                {#if showAllLink}
                    <a
                        href={showAllLink}
                        class="hover:text-[var(--accent)] transition-colors"
                        >{title}</a
                    >
                {:else}
                    {title}
                {/if}
            </h1>
            {#if totalItems > 0 && !showAllLink}
                <span
                    class="text-[var(--text-muted)] text-sm font-normal self-end mb-1"
                >
                    {totalItems} items
                </span>
            {/if}
        </div>

        <div class="flex items-center gap-4 ml-auto">
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
                        onclick={() => setViewMode("grid")}
                        aria-label="Grid View"
                    >
                        <LayoutGrid size={20} />
                    </button>
                    <button
                        class="p-2 rounded-md transition-colors {viewMode ===
                        'list'
                            ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}"
                        onclick={() => setViewMode("list")}
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
                        onclick={prevPage}
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
                        onclick={nextPage}
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

    <!-- Bottom Pagination (if paginated) -->
    {#if !showAllLink && totalItems > 0 && baseUrl}
        <div class="flex justify-center gap-2 mt-8">
            <button
                onclick={prevPage}
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
                onclick={nextPage}
                disabled={currentPage >= totalPages}
                class="p-2 rounded-full bg-[var(--bg-card)] border border-[var(--border-primary)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                <ChevronRight size={20} />
            </button>
        </div>
    {/if}
</div>
