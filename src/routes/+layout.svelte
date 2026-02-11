<script>
  import "../app.css";
  import { page } from "$app/stores";
  import {
    isPlaying,
    currentTrack,
    togglePlay,
    playNext,
    playPrev,
    duration,
    seek,
    volume,
    setVolume,
    showQueue,
  } from "../lib/player.js";
  import { getCoverArtUrl } from "../lib/subsonic.js";
  import { goto } from "$app/navigation";
  import { auth } from "../lib/auth";
  import { onMount } from "svelte";
  import { subsonicFetch } from "../lib/subsonic";
  import { theme } from "../lib/stores/theme";
  import { parseArtistString } from "../lib/utils/artistUtils";
  import QueuePanel from "../lib/components/QueuePanel.svelte";
  import PlayerBar from "../lib/components/PlayerBar.svelte";
  import TopBar from "../lib/components/TopBar.svelte";
  import Sidebar from "../lib/components/Sidebar.svelte";

  let isSidebarOpen = $state(false);

  function toggleSidebar() {
    isSidebarOpen = !isSidebarOpen;
  }

  function closeSidebar() {
    isSidebarOpen = false;
  }

  let playerRef = $state();
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
  <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

  <div class="flex-1 flex flex-col min-w-0 relative">
    <!-- TOP BAR -->
    <TopBar onToggle={toggleSidebar} />

    <!-- MAIN CONTENT AREA -->
    <main class="flex-1 overflow-y-auto p-4 md:p-8 pb-24">
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
