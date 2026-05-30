<script>
    import {
        Menu,
        Search,
        ListMusic,
        ChevronLeft,
        ChevronRight,
    } from "lucide-svelte";
    import { toggleQueue, showQueue } from "../player.js";
    import { goto } from "$app/navigation";
    import { resolve } from "$app/paths";
    import LibrarySelector from "./LibrarySelector.svelte";

    let { onToggle } = $props();

    let searchQuery = $state("");
    /**
     * @param {KeyboardEvent} e
     */

    function handleSearch(e) {
        if (e.key === "Enter" && searchQuery.trim()) {
            goto(resolve("/search") + `?q=${encodeURIComponent(searchQuery)}`);
        }
    }

    let isMobileMenuOpen = $state(false);

    function toggleMobileMenu() {
        isMobileMenuOpen = !isMobileMenuOpen;
    }

    function closeMobileMenu() {
        isMobileMenuOpen = false;
    }
</script>

<!-- TOP BAR -->
<header
    class="bg-[var(--bg-sidebar)] backdrop-blur-xl border-b border-[var(--border-primary)] grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center px-4 md:px-8 shrink-0 sticky top-0 z-40 gap-4"
    style="padding-top: env(safe-area-inset-top); height: calc(4rem + env(safe-area-inset-top));"
>
    <div class="flex items-center justify-start gap-3">
        <button
            onclick={onToggle}
            class="md:hidden text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
            <Menu size={24} />
        </button>
        <LibrarySelector />
    </div>

    <div class="flex items-center justify-center">
        <div class="relative w-full md:w-96">
            <Search
                class="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
                size={18}
            />
            <input
                type="text"
                bind:value={searchQuery}
                onkeydown={handleSearch}
                placeholder="Search songs, artists, albums..."
                class="w-full bg-[var(--bg-card)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-full py-2 pl-10 pr-4 focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all placeholder-[var(--text-muted)] text-sm"
            />
        </div>
    </div>

    <div class="flex items-center justify-end">
        <button
            onclick={toggleQueue}
            class="flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300
            {$showQueue
                ? 'bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/20'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'}"
            title="Toggle Queue"
        >
            {#if !$showQueue}
                <ChevronLeft size={18} />
            {/if}

            <ListMusic size={20} />

            <span class="hidden md:inline font-medium text-sm">Queue</span>

            {#if $showQueue}
                <ChevronRight size={18} />
            {/if}
        </button>
    </div>
</header>
