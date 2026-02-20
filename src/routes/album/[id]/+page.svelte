<script>
  import { onMount, onDestroy } from "svelte";
  import { page } from "$app/stores";
  import {
    subsonicFetch,
    getCoverArtUrl,
    starTrack,
    unstarTrack,
    starAlbum,
    unstarAlbum,
  } from "../../../lib/subsonic.js";
  import {
    playQueue,
    playQueueShuffled,
    currentTrack,
    isPlaying,
    togglePlay,
  } from "../../../lib/player.js";
  import { Play, Shuffle, Heart, Disc } from "lucide-svelte";
  import BackButton from "../../../lib/components/BackButton.svelte";
  import SongList from "../../../lib/components/SongList.svelte";
  import { formatDuration } from "../../../lib/utils/formatDuration.js";
  import { resolve } from "$app/paths";

  /** @type {any} */
  let album = $state(null);
  let loading = $state(true);

  onMount(async () => {
    const albumId = $page.params.id;
    const data = await subsonicFetch("getAlbum", `&id=${albumId}`);
    if (data && data.album) {
      album = data.album;
    }
    loading = false;
    startSyncLoop();
  });

  onDestroy(() => {
    if (syncInterval) clearInterval(syncInterval);
  });

  /** @type {any} */
  let syncInterval;

  function startSyncLoop() {
    if (syncInterval) clearInterval(syncInterval);
    syncInterval = setInterval(async () => {
      if (!album) return;
      try {
        const data = await subsonicFetch("getAlbum", `&id=${album.id}`);
        if (data && data.album && data.album.song) {
          const serverSongs = data.album.song;
          let changed = false;

          const serverSongList = Array.isArray(serverSongs)
            ? serverSongs
            : [serverSongs];
          const localSongList = Array.isArray(album.song)
            ? album.song
            : [album.song];

          for (const serverSong of serverSongList) {
            const localSong = localSongList.find(
              (/** @type {{ id: any; }} */ s) => s.id === serverSong.id,
            );
            if (localSong) {
              if (localSong.starred !== serverSong.starred) {
                localSong.starred = serverSong.starred;
                changed = true;
              }
            }
          }

          if (changed) {
            album = album;
          }

          if (album.starred !== data.album.starred) {
            album.starred = data.album.starred;
            album = album;
          }
        }
      } catch (error) {
        console.error("Failed to sync album:", error);
      }
    }, 10000); // Poll every 10 seconds
  }

  let songs = $derived(
    album && album.song
      ? (Array.isArray(album.song) ? album.song : [album.song])
          .slice()
          .sort((/** @type {any} */ a, /** @type {any} */ b) => {
            const discA = a.discNumber || 1;
            const discB = b.discNumber || 1;
            if (discA !== discB) return discA - discB;
            const trackA = a.track || 0;
            const trackB = b.track || 0;
            return trackA - trackB;
          })
      : [],
  );
  let genres = $derived.by(() => {
    if (!album) return [];
    const source = album.genres || album.genre;
    if (!source) return [];

    let list = Array.isArray(source) ? source : [source];
    return list
      .map((/** @type {any} */ item) => {
        if (typeof item === "object" && item.name) return item.name;
        if (typeof item === "string")
          return item.split(/[;,]/).map((s) => s.trim());
        return item;
      })
      .flat()
      .filter((/** @type {any} */ g) => g && typeof g === "string")
      .slice(0, 3);
  });

  let groupedSongs = $derived(
    songs.reduce(
      (
        /** @type {any[]} */ acc,
        /** @type {any} */ song,
        /** @type {number} */ index,
      ) => {
        song.globalIndex = index;
        const disc = song.discNumber || 1;
        let lastGroup = acc[acc.length - 1];
        if (!lastGroup || lastGroup.disc !== disc) {
          lastGroup = { disc, songs: [] };
          acc.push(lastGroup);
        }
        lastGroup.songs.push(song);
        return acc;
      },
      [],
    ),
  );

  function playAlbum() {
    if (songs && songs.length > 0) {
      playQueue(songs, 0, {
        type: "album",
        id: album.id,
        name: album.title || album.name,
      });
    }
  }

  /**
   * Toggle starred status for the album
   * @param {Event} event
   */
  async function toggleAlbumFavorite(event) {
    event.stopPropagation();

    const isStarred = !!album.starred;

    try {
      if (isStarred) {
        await unstarAlbum(album.id);
        album.starred = undefined;
      } else {
        await starAlbum(album.id);
        album.starred = new Date().toISOString();
      }
      // Force reactivity
      album = album;
    } catch (error) {
      console.error("Failed to toggle album favorite:", error);
    }
  }
</script>

{#if loading}
  <div class="flex items-center justify-center h-full text-gray-500">
    Loading...
  </div>
{:else if album}
  <div class="flex flex-col gap-8 pb-[25%] md:pb-[7%]">
    <!-- BACK BUTTON -->
    <div>
      <BackButton />
    </div>

    <!-- HEADER -->
    <div
      class="flex flex-col md:flex-row gap-8 items-center md:items-end lg:items-end"
    >
      <img
        src={getCoverArtUrl(album.id)}
        alt={album.title || album.name}
        class="w-64 h-64 rounded-lg shadow-2xl object-cover bg-[var(--bg-card)]"
      />
      <div class="flex flex-col gap-4 mb-2 items-center md:items-start">
        <span
          class="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)] inline-flex items-center gap-2"
          ><Disc size={24} /> Album</span
        >
        <h1 class="text-5xl font-bold text-[var(--text-primary)]">
          {album.title || album.name}
        </h1>
        <div
          class="flex flex-col md:flex-row md:items-center gap-x-2 gap-y-1 text-[var(--text-secondary)] items-center md:items-start"
        >
          {#if album.artist}
            <div class="flex items-center gap-2">
              <a href={resolve(`/artist/${album.artistId}`)}>
                <span
                  class="font-semibold text-[var(--text-primary)] hover:underline"
                  >{album.artist}</span
                >
              </a>
              <span class="hidden md:inline">•</span>
            </div>
          {/if}
          <div class="flex items-center gap-2 text-sm md:text-base">
            <span>{album.year || "Unknown Year"}</span>
            <span>•</span>
            <span>{album.songCount} songs</span>
            <span>•</span>
            <span>{formatDuration(album.duration)}</span>
          </div>
        </div>

        <!-- GENRES -->
        {#if genres.length > 0}
          <div
            class="flex flex-wrap gap-2 mt-1 justify-center md:justify-start"
          >
            {#each genres as genre}
              <span
                class="px-3 py-1 text-xs font-medium rounded-full bg-[var(--bg-card)] border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                {genre}
              </span>
            {/each}
          </div>
        {/if}
      </div>
    </div>

    <!-- ACTIONS -->
    <div class="flex items-center gap-4 justify-center md:justify-start">
      <button
        onclick={playAlbum}
        class="bg-[var(--accent)] text-[var(--accent-fg)] rounded-full p-4 hover:scale-105 transition-transform shadow-lg flex items-center justify-center"
        title="Play Album"
      >
        <Play size={28} fill="currentColor" class="ml-1" />
      </button>
      <button
        onclick={() => playQueueShuffled(songs)}
        class="bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-primary)] rounded-full p-4 hover:bg-[var(--bg-hover)] transition-colors shadow-lg flex items-center justify-center"
        title="Shuffle Album"
      >
        <Shuffle size={24} />
      </button>
      <button
        onclick={toggleAlbumFavorite}
        class="bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-primary)] rounded-full p-4 hover:bg-[var(--bg-hover)] transition-colors shadow-lg flex items-center justify-center"
        title={album.starred ? "Unfavorite Album" : "Favorite Album"}
      >
        <Heart
          size={24}
          class={album.starred
            ? "text-red-500 fill-red-500"
            : "text-[var(--text-secondary)]"}
        />
      </button>
    </div>

    <!-- TRACKLIST -->
    <div class="flex flex-col">
      <SongList
        {songs}
        context="album"
        contextId={album.id}
        contextName={album.title || album.name}
        showToolbar={false}
      />
    </div>
  </div>
{:else}
  <div class="text-center text-red-500">Album not found</div>
{/if}
