<script>
    import {
        Menu,
        Search,
        Home,
        Library,
        Settings,
        Heart,
        Mic2,
        Disc,
        Music,
        ListMusic,
    } from "lucide-svelte";
    import { goto } from "$app/navigation";
    import { page } from "$app/stores";
    import { auth } from "../../lib/auth";
    import { resolve } from "$app/paths";

    let { isOpen, onClose } = $props();

    let isMobileMenuOpen = $state(false);

    function toggleMobileMenu() {
        isMobileMenuOpen = !isMobileMenuOpen;
    }

    function closeMobileMenu() {
        isMobileMenuOpen = false;
    }

    const navItems = [
        { label: "Home", href: resolve("/"), icon: Home },
        { label: "Favorites", href: resolve("/favorites"), icon: Heart },
        { label: "Artists", href: resolve("/artists"), icon: Mic2 },
        { label: "Albums", href: resolve("/albums"), icon: Disc },
        { label: "Songs", href: resolve("/songs"), icon: Music },
        { label: "Playlists", href: resolve("/playlists"), icon: ListMusic },
    ];
</script>

<!-- MOBILE OVERLAY -->
{#if isOpen}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        class="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
        onclick={onClose}
    ></div>
{/if}

<!-- SIDEBAR -->
<aside
    class="fixed inset-y-0 left-0 z-50 w-64 bg-[var(--bg-sidebar)] flex flex-col border-r border-[var(--border-primary)] transition-transform duration-300 ease-in-out md:relative md:translate-x-0
    {isOpen ? 'translate-x-0' : '-translate-x-full'}"
>
    <div class="p-6">
        <h1 class="text-2xl font-bold tracking-tight text-[var(--accent)]">
            AstroTunes
        </h1>
    </div>

    <nav class="flex-1 px-4 space-y-2">
        {#each navItems as item}
            <a
                href={item.href}
                onclick={closeMobileMenu}
                class="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200
          {$page.url.pathname === item.href
                    ? 'bg-[var(--bg-card)] text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'}"
            >
                <item.icon size={20} />
                <span class="font-medium">{item.label}</span>
            </a>
        {/each}
    </nav>

    <div class="p-4 border-t border-[var(--border-primary)]">
        <a
            href="/settings"
            onclick={closeMobileMenu}
            class="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200
        {$page.url.pathname === '/settings'
                ? 'bg-[var(--bg-card)] text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'}"
        >
            <Settings size={20} />
            <span class="font-medium">Settings</span>
        </a>

        <div
            class="px-4 py-2 text-xs flex items-center gap-2 truncate text-[var(--text-secondary)]"
        >
            <div
                class="w-2 h-2 rounded-full shrink-0 {$auth.isConnected
                    ? 'bg-green-500'
                    : 'bg-red-500'}"
            ></div>
            {#if $auth.isConnected && $auth.username}
                <span class="truncate">Connected as {$auth.username}</span>
            {:else}
                <span>Disconnected</span>
            {/if}
        </div>
    </div>
</aside>
