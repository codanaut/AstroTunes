<script>
    import { Menu, Search } from "lucide-svelte";
    import { goto } from "$app/navigation";
    import { resolve } from "$app/paths";

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
    class="h-16 bg-[var(--bg-sidebar)]/50 backdrop-blur-md border-b border-[var(--border-primary)] flex items-center justify-center px-4 md:px-8 shrink-0 sticky top-0 z-40 gap-4"
>
    <button
        onclick={onToggle}
        class="md:hidden text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
    >
        <Menu size={24} />
    </button>

    <div class="relative flex-1 md:w-96 md:flex-none">
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
</header>
