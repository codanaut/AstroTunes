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
    playQueue,
    removeFromQueue,
    moveInQueue,
    clearQueue,
    shuffleCurrentQueue,
    context,
  } from "../lib/player.js";
  import { getCoverArtUrl } from "../lib/subsonic.js";
  import {
    Play,
    Pause,
    SkipForward,
    SkipBack,
    Square,
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
    Wifi,
    Trash2,
    Shuffle,
    ArrowUp,
    ArrowDown,
    Maximize2,
  } from "lucide-svelte";
  import { goto } from "$app/navigation";
  import { auth } from "../lib/auth";
  import { onMount } from "svelte";
  import { subsonicFetch } from "../lib/subsonic";
  import { theme } from "../lib/stores/theme";

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
      {console.log($currentTrack)}
      <div
        class="h-20 md:h-24 bg-[var(--bg-main)] border-t border-[var(--border-primary)] {$page
          .url.pathname === '/now-playing'
          ? 'hidden md:flex'
          : 'flex'} items-center px-4 md:px-6 justify-between shrink-0 z-50 gap-2 md:gap-4 relative"
      >
        <!-- Mobile Expand Touch Target -->
        <a
          href="/now-playing"
          class="md:hidden absolute inset-0 z-10 flex justify-center"
          aria-label="Open Now Playing"
        >
          <div class="w-8 h-1 bg-white/20 rounded-b-full absolute top-0"></div>
        </a>
        <!-- INFO -->
        <div
          class="flex items-center flex-1 min-w-0 mr-2 md:mr-4 z-20 relative pointer-events-none md:pointer-events-auto"
        >
          <a
            href={`/album/${$currentTrack.albumId}`}
            class="pointer-events-auto"
            ><img
              src={getCoverArtUrl($currentTrack.id)}
              alt="Art"
              class="h-12 w-12 md:h-16 md:w-16 rounded-md bg-[var(--bg-card)] mr-3 md:mr-4 object-cover shadow-lg"
            /></a
          >
          <div
            class="truncate flex flex-col justify-center pointer-events-auto"
          >
            <div
              class="font-bold text-[var(--text-primary)] truncate text-base md:text-lg leading-tight"
            >
              {$currentTrack.title}
            </div>
            <div
              class="flex items-center gap-2 text-xs md:text-sm text-[var(--text-secondary)] truncate"
            >
              <a
                class="hover:text-[var(--accent)] transition-colors truncate"
                href={`/artist/${$currentTrack.artistId}`}
              >
                {$currentTrack.artist}
              </a>
              <span class="text-[var(--text-muted)]">•</span>
              <a
                class="hover:text-[var(--accent)] transition-colors truncate"
                href={`/album/${$currentTrack.albumId}`}
              >
                {$currentTrack.album}
              </a>
            </div>
            <!-- Context Link -->
            {#if $context && $context.type && $context.name}
              <div
                class="text-[10px] uppercase tracking-wider text-[var(--accent)] mt-0.5 truncate hidden md:block"
              >
                Playing from: <a
                  href={$context.type === "favorites"
                    ? "/favorites"
                    : $context.type === "search"
                      ? `/search?q=${encodeURIComponent($context.id || "")}`
                      : $context.type === "playlist"
                        ? `/playlists?id=${encodeURIComponent($context.id || "")}`
                        : `/${$context.type}/${encodeURIComponent($context.id || "")}`}
                  class="hover:underline font-bold">{$context.name}</a
                >
              </div>
            {/if}
          </div>
        </div>

        <!-- CONTROLS -->
        <div class="flex flex-col items-center flex-none z-20 relative">
          <div class="flex items-center gap-2 md:gap-4 mb-0 md:mb-2">
            <!-- Repeat Button -->
            <button
              onclick={toggleRepeat}
              class="hidden md:block text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              title="Repeat: {$repeatMode}"
            >
              {#if $repeatMode === "one"}
                <Repeat1 size={20} class="text-[var(--accent)]" />
              {:else if $repeatMode === "all"}
                <Repeat size={20} class="text-[var(--accent)]" />
              {:else}
                <Repeat size={20} />
              {/if}
            </button>

            <button
              onclick={playPrev}
              class="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              ><SkipBack size={20} class="md:w-6 md:h-6" /></button
            >

            <button
              onclick={togglePlay}
              class="p-2 md:p-3 bg-[var(--text-primary)] rounded-full text-[var(--bg-main)] hover:scale-105 transition-transform"
            >
              {#if $isPlaying}<Pause
                  size={20}
                  fill="currentColor"
                  class="md:w-6 md:h-6"
                />{:else}<Play
                  size={20}
                  fill="currentColor"
                  class="ml-0.5 md:ml-1 md:w-6 md:h-6"
                />{/if}
            </button>

            <button
              onclick={playNext}
              class="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              ><SkipForward size={20} class="md:w-6 md:h-6" /></button
            >

            <!-- Favorite Button -->
            <button
              onclick={toggleFavorite}
              class="hidden md:block text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              title="Favorite"
            >
              <Heart
                size={20}
                class={$isFavorite ? "text-red-500 fill-red-500" : ""}
              />
            </button>
          </div>

          <div
            class="hidden md:flex w-full items-center gap-3 text-xs text-[var(--text-secondary)] font-mono"
          >
            <span>{new Date($progress * 1000).toISOString().substr(14, 5)}</span
            >
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
              class="w-64 h-1.5 bg-[var(--bg-hover)] rounded-full relative cursor-pointer group"
              onclick={handleSeek}
            >
              <div
                class="h-full bg-[var(--text-primary)] rounded-full absolute top-0 left-0 group-hover:bg-[var(--accent)] transition-colors"
                style="width: {($progress / $duration) * 100}%"
              ></div>
            </div>
            <span>{new Date($duration * 1000).toISOString().substr(14, 5)}</span
            >
          </div>
        </div>

        <!-- VOLUME & INFO -->
        <div
          class="hidden md:flex justify-end gap-4 items-center flex-1 min-w-0"
        >
          <!-- Song Format -->
          <div
            class="flex flex-col items-end text-xs text-[var(--text-secondary)] mr-2"
          >
            <span class="font-semibold text-[var(--text-muted)] uppercase"
              >{$currentTrack.suffix}</span
            >
            <span>
              {#if $currentTrack.bitDepth}
                {formatBitDepth($currentTrack.bitDepth)}
              {/if}
              {#if $currentTrack.bitDepth && $currentTrack.samplingRate}/
              {/if}
              {#if $currentTrack.samplingRate}
                {formatSampleRate($currentTrack.samplingRate)}
              {/if}
            </span>
          </div>

          <!-- Queue Button -->
          <button
            onclick={toggleQueue}
            class="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            title="Queue"
          >
            <ListMusic
              size={20}
              class={$showQueue ? "text-[var(--accent)]" : ""}
            />
          </button>

          <!-- Volume -->
          <button
            onclick={toggleMute}
            class="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            {#if isMuted}
              <VolumeX size={20} />
            {:else}
              <Volume2 size={20} />
            {/if}
          </button>
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            class="volume-slider w-24 h-1.5 bg-[var(--bg-hover)] rounded-full relative cursor-pointer group"
            onmousedown={handleVolumeMouseDown}
            onwheel={handleVolumeWheel}
          >
            <div
              class="h-full bg-[var(--text-primary)] rounded-full absolute top-0 left-0 group-hover:bg-[var(--accent)] transition-colors"
              style="width: {$volume * 100}%"
            ></div>
          </div>

          <!-- Close Button -->
          <a
            href="/now-playing"
            class="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors ml-2"
            title="Expand Player"
          >
            <Maximize2 size={20} />
          </a>

          <button
            onclick={closePlayer}
            class="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors ml-2"
            title="Close Player"
          >
            <X size={20} />
          </button>
        </div>
      </div>
    {/if}
  </div>

  <!-- QUEUE PANEL (RIGHT SIDE) -->
  {#if $showQueue}
    <aside
      class="fixed inset-0 z-40 md:static w-full md:w-80 bg-[var(--bg-sidebar)] border-l border-[var(--border-primary)] flex flex-col overflow-hidden"
    >
      <div
        class="p-4 border-b border-[var(--border-primary)] flex justify-between items-center mt-16 md:mt-0"
      >
        <div>
          <h2 class="text-xl font-bold">Queue</h2>
          <p class="text-sm text-[var(--text-secondary)]">
            {$queue.length} tracks
          </p>
        </div>
        <div class="flex gap-2">
          <button
            onclick={shuffleCurrentQueue}
            class="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            title="Shuffle Queue"
          >
            <Shuffle size={18} />
          </button>
          <button
            onclick={clearQueue}
            class="p-2 text-[var(--text-secondary)] hover:text-red-500"
            title="Clear Queue"
          >
            <Trash2 size={18} />
          </button>
          <button
            onclick={toggleQueue}
            class="md:hidden p-2 text-[var(--text-secondary)]"
          >
            <X />
          </button>
        </div>
      </div>
      <div class="flex-1 overflow-y-auto">
        {#each $queue as track, index}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            class="group relative p-3 border-b border-[var(--border-primary)] hover:bg-[var(--bg-card)] transition-colors
              {$currentTrack?.id === track.id
              ? 'bg-[var(--bg-card)] border-l-4 border-l-[var(--accent)]'
              : ''}"
          >
            <div
              class="flex items-start gap-3 cursor-pointer"
              onclick={() => playQueue($queue, index)}
            >
              <span class="text-sm text-[var(--text-muted)] w-6 shrink-0"
                >{index + 1}</span
              >
              <div class="flex-1 min-w-0">
                <div
                  class="font-medium truncate {$currentTrack?.id === track.id
                    ? 'text-[var(--accent)]'
                    : 'text-[var(--text-primary)]'}"
                >
                  {track.title}
                </div>
                <div class="text-sm text-[var(--text-secondary)] truncate">
                  {track.artist}
                </div>
                <div class="text-xs text-[var(--text-muted)] truncate">
                  {track.album}
                </div>
              </div>
              {#if track.duration}
                <span class="text-xs text-[var(--text-muted)] shrink-0">
                  {new Date(track.duration * 1000).toISOString().substr(14, 5)}
                </span>
              {/if}
            </div>

            <!-- HOVER ACTIONS -->
            <div
              class="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1 bg-[var(--bg-card)] shadow-md rounded-md p-1"
            >
              <button
                onclick={(e) => {
                  e.stopPropagation();
                  moveInQueue(index, index - 1);
                }}
                class="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30"
                disabled={index === 0}
                title="Move Up"
              >
                <ArrowUp size={14} />
              </button>
              <button
                onclick={(e) => {
                  e.stopPropagation();
                  moveInQueue(index, index + 1);
                }}
                class="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30"
                disabled={index === $queue.length - 1}
                title="Move Down"
              >
                <ArrowDown size={14} />
              </button>
              <button
                onclick={(e) => {
                  e.stopPropagation();
                  removeFromQueue(index);
                }}
                class="p-1 text-[var(--text-secondary)] hover:text-red-500"
                title="Remove"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        {/each}
      </div>
    </aside>
  {/if}
</div>
