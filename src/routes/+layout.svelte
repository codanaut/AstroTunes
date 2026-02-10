<script>
  import "../app.css";
  import { page } from "$app/stores";
  import {
    isPlaying,
    currentTrack,
    togglePlay,
    playNext,
    playPrev,
    progress,
    duration,
    stop,
    seek,
    volume,
    setVolume,
    repeatMode,
    toggleRepeat,
    isFavorite,
    toggleFavorite,
    showQueue,
    toggleQueue,
    closePlayer,
    queue,
    context,
  } from "../lib/player.js";
  import { getCoverArtUrl } from "../lib/subsonic.js";
  import {
    Play,
    Pause,
    SkipForward,
    SkipBack,
    Home,
    Mic2,
    Disc,
    Music,
    ListMusic,
    Volume2,
    VolumeX,
    Repeat,
    Repeat1,
    Heart,
    X,
    Search,
    Menu,
    Settings,
    Maximize2,
  } from "lucide-svelte";
  import { goto } from "$app/navigation";
  import { auth } from "../lib/auth";
  import { onMount } from "svelte";
  import { subsonicFetch } from "../lib/subsonic";
  import { theme } from "../lib/stores/theme";
  import { parseArtistString } from "../lib/utils/artistUtils";
  import QueuePanel from "../lib/components/QueuePanel.svelte";
  import PlayerBar from "../lib/components/PlayerBar.svelte";

  let playerRef;
  let { children } = $props();

  /**
   * @param {{ currentTarget: any; clientX: number; }} e
   */
  function handleSeek(e) {
    const bar = e.currentTarget;
    const rect = bar.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    seek(percentage * $duration);
  }

  /**
   * @param {{ currentTarget: any; clientX: number; }} e
   */
  function handleVolumeChange(e) {
    const bar = e.currentTarget;
    const rect = bar.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    setVolume(percentage);
  }

  let isDraggingVolume = $state(false);
  let isMuted = $state(false);
  let previousVolume = $state(1.0);

  /**
   * @param {{ currentTarget: any; clientX: number; }} e
   */
  function handleVolumeMouseDown(e) {
    isDraggingVolume = true;
    handleVolumeChange(e);
  }

  /**
   * @param {{ clientX: number; }} e
   */
  function handleVolumeMouseMove(e) {
    if (isDraggingVolume) {
      const bar = document.querySelector(".volume-slider");
      if (bar) {
        const rect = bar.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, x / rect.width));
        setVolume(percentage);
      }
    }
  }

  function handleVolumeMouseUp() {
    isDraggingVolume = false;
  }

  /**
   * @param {{ deltaY: number; preventDefault: () => void; }} e
   */
  function handleVolumeWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    const newVolume = Math.max(0, Math.min(1, $volume + delta));
    setVolume(newVolume);
    if (newVolume > 0 && isMuted) {
      isMuted = false;
    }
  }

  function toggleMute() {
    if (isMuted) {
      setVolume(previousVolume);
      isMuted = false;
    } else {
      previousVolume = $volume;
      setVolume(0);
      isMuted = true;
    }
  }

  const navItems = [
    { label: "Home", href: "/", icon: Home },
    { label: "Favorites", href: "/favorites", icon: Heart },
    { label: "Artists", href: "/artists", icon: Mic2 },
    { label: "Albums", href: "/albums", icon: Disc },
    { label: "Songs", href: "/songs", icon: Music },
    { label: "Playlists", href: "/playlists", icon: ListMusic },
  ];

  /**
   * Format sample rate to human readable format
   * @param {number} rate - Sample rate in Hz
   */
  function formatSampleRate(rate) {
    if (!rate) return "";
    if (rate >= 1000) {
      return (rate / 1000).toFixed(1) + " kHz";
    }
    return rate + " Hz";
  }

  /**
   * Format bit depth
   * @param {number} depth - Bit depth
   */
  function formatBitDepth(depth) {
    if (!depth) return "";
    return depth + "bit";
  }

  let searchQuery = $state("");

  /**
   * @param {KeyboardEvent} e
   */
  function handleSearch(e) {
    if (e.key === "Enter" && searchQuery.trim()) {
      goto(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  }

  let isMobileMenuOpen = $state(false);

  function toggleMobileMenu() {
    isMobileMenuOpen = !isMobileMenuOpen;
  }

  function closeMobileMenu() {
    isMobileMenuOpen = false;
  }

  onMount(async () => {
    if ($auth.serverUrl && $auth.username) {
      try {
        const res = await subsonicFetch("ping");
        if (res && res.status === "ok") {
          auth.update((s) => ({ ...s, isConnected: true }));
        } else {
          auth.update((s) => ({ ...s, isConnected: false }));
        }
      } catch (e) {
        auth.update((s) => ({ ...s, isConnected: false }));
      }
    }
  });

  // Media Session
  $effect(() => {
    if ("mediaSession" in navigator && $currentTrack) {
      // 1. Update Metadata
      navigator.mediaSession.metadata = new MediaMetadata({
        title: $currentTrack.title,
        artist: $currentTrack.artist,
        album: $currentTrack.album,
        artwork: [
          {
            src: getCoverArtUrl($currentTrack.id, 512),
            sizes: "512x512",
            type: "image/png",
          },
        ],
      });

      // 2. Define actions with explicit types to satisfy the compiler
      /** @type {Array<[MediaSessionAction, () => void]>} */
      const actions = [
        ["play", togglePlay],
        ["pause", togglePlay],
        ["previoustrack", playPrev],
        ["nexttrack", playNext],
      ];

      // 3. Register handlers
      for (const [action, handler] of actions) {
        try {
          navigator.mediaSession.setActionHandler(action, handler);
        } catch (error) {
          // Ignore actions not supported by the current browser
        }
      }
    }
  });

  // 4. Update Playback State reactively
  $effect(() => {
    if ("mediaSession" in navigator) {
      navigator.mediaSession.playbackState = $isPlaying ? "playing" : "paused";
    }
  });
</script>

<svelte:body
  onmousemove={handleVolumeMouseMove}
  onmouseup={handleVolumeMouseUp}
/>

<div
  class="h-screen flex bg-[var(--bg-main)] text-[var(--text-primary)] overflow-hidden relative"
>
  <!-- MOBILE OVERLAY -->
  {#if isMobileMenuOpen}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
      onclick={closeMobileMenu}
    ></div>
  {/if}

  <!-- SIDEBAR -->
  <aside
    class="fixed inset-y-0 left-0 z-50 w-64 bg-[var(--bg-sidebar)] flex flex-col border-r border-[var(--border-primary)] transition-transform duration-300 ease-in-out md:relative md:translate-x-0
    {isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}"
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

  <div class="flex-1 flex flex-col min-w-0">
    <!-- TOP BAR -->
    <header
      class="h-16 bg-[var(--bg-sidebar)]/50 backdrop-blur-md border-b border-[var(--border-primary)] flex items-center justify-center px-4 md:px-8 shrink-0 sticky top-0 z-40 gap-4"
    >
      <button
        onclick={toggleMobileMenu}
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

    <!-- MAIN CONTENT AREA -->
    <main class="flex-1 overflow-y-auto p-4 md:p-8">
      {@render children()}
    </main>

    <!-- PLAYER BAR -->
    {#if $currentTrack}
      <PlayerBar bind:this={playerRef} />
    {/if}
  </div>

  <!-- QUEUE PANEL (RIGHT SIDE) -->
  {#if $showQueue}
    <QueuePanel />
  {/if}
</div>
