<script>
  import "../app.css";
  import {
    isPlaying,
    currentTrack,
    togglePlay,
    playNext,
    playPrev,
    showQueue,
  } from "../lib/player.js";
  import { getCoverArtUrl } from "../lib/subsonic.js";
  import { auth } from "../lib/auth";
  import { onMount } from "svelte";
  import { subsonicFetch } from "../lib/subsonic";
  import QueuePanel from "../lib/components/QueuePanel.svelte";
  import PlayerBar from "../lib/components/PlayerBar.svelte";
  import { page } from "$app/stores";
  import TopBar from "../lib/components/TopBar.svelte";
  import Sidebar from "../lib/components/Sidebar.svelte";
  import { resolve } from "$app/paths";
  import { libraryStore } from "../lib/stores/library.js";

  let isSidebarOpen = $state(false);

  function toggleSidebar() {
    isSidebarOpen = !isSidebarOpen;
  }

  function closeSidebar() {
    isSidebarOpen = false;
  }

  let playerRef = $state();
  let { children } = $props();

  let isNowPlayingPage = $derived(
    $page.url.pathname === resolve("/now-playing"),
  );

  $effect(() => {
    if (isNowPlayingPage) {
      showQueue.set(false);
    }
  });

  onMount(async () => {
    if ($auth.serverUrl && $auth.username) {
      try {
        const res = await subsonicFetch("ping");
        if (res && res.status === "ok") {
          auth.update((s) => ({ ...s, isConnected: true }));
          // Load music folders (libraries) now that auth is confirmed
          await libraryStore.load(subsonicFetch);
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

<div
  class="h-full flex bg-[var(--bg-main)] text-[var(--text-primary)] overflow-hidden relative"
  style="height: 100dvh;"
>
  <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

  <div class="flex-1 flex flex-col min-w-0 relative">
    <!-- TOP BAR -->
    {#if !isNowPlayingPage}
      <TopBar onToggle={toggleSidebar} />
    {:else}
      <div class="hidden md:block">
        <TopBar onToggle={toggleSidebar} />
      </div>
    {/if}

    <!-- MAIN CONTENT AREA -->
    <main
      class="flex-1 overflow-y-auto {isNowPlayingPage ? '' : 'p-4 md:p-8'}"
      style={isNowPlayingPage
        ? ""
        : "padding-bottom: calc(6rem + env(safe-area-inset-bottom));"}
    >
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
