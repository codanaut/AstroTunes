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
    getTopSongs,
  } from "../../../lib/subsonic.js";
  import {
    playQueue,
    playQueueShuffled,
    currentTrack,
    isPlaying,
  } from "../../../lib/player.js";
  import { Play, Shuffle, Heart, Mic2 } from "lucide-svelte";
  import BackButton from "../../../lib/components/BackButton.svelte";
  import SongList from "../../../lib/components/SongList.svelte";
  import AlbumCard from "../../../lib/components/AlbumCard.svelte";
  import SimilarArtists from "../../../lib/components/SimilarArtists.svelte";

  /** @type {any} */
  let artist = null;
  /** @type {any[]} */
  let topSongs = [];
  let loading = true;
  /** @type {any} */
  let syncInterval;

  // Reactively load artist data when the ID changes
  $: if ($page.params.id) {
    loadArtist($page.params.id);
  }

  /**
   * @param {string} artistId
   */
  async function loadArtist(artistId) {
    loading = true;
    artist = null; // Reset artist
    const data = await subsonicFetch("getArtist", `&id=${artistId}`);
    if (data && data.artist) {
      artist = data.artist;
      // Fetch top songs
      const topSongsData = await getTopSongs(artist.name);
      console.log(topSongsData);
      if (topSongsData && topSongsData.topSongs && topSongsData.topSongs.song) {
        topSongs = Array.isArray(topSongsData.topSongs.song)
          ? topSongsData.topSongs.song
          : [topSongsData.topSongs.song];
      }
    }
    loading = false;
    startSyncLoop();
  }

  onMount(() => {
    // Initial sync is handled by the reactive statement since $page.params.id is available
  });

  onDestroy(() => {
    if (syncInterval) clearInterval(syncInterval);
  });

  function startSyncLoop() {
    if (syncInterval) clearInterval(syncInterval);
    syncInterval = setInterval(async () => {
      if (!artist) return;
      try {
        const data = await subsonicFetch("getArtist", `&id=${artist.id}`);
        if (data && data.artist && data.artist.album) {
          const serverAlbums = data.artist.album;
          let changed = false;

          const serverAlbumList = Array.isArray(serverAlbums)
            ? serverAlbums
            : [serverAlbums];
          const localAlbumList = Array.isArray(artist.album)
            ? artist.album
            : [artist.album];

          for (const serverAlbum of serverAlbumList) {
            const localAlbum = localAlbumList.find(
              (/** @type {{ id: any; }} */ s) => s.id === serverAlbum.id,
            );
            if (localAlbum) {
              if (localAlbum.starred !== serverAlbum.starred) {
                localAlbum.starred = serverAlbum.starred;
                changed = true;
              }
            }
          }

          if (changed) {
            artist = artist; // Trigger reactivity
          }

          // Check if album starred status changed
          if (artist.starred !== data.artist.starred) {
            artist.starred = data.artist.starred;
            artist = artist;
          }
        }
      } catch (error) {
        console.error("Failed to sync artist:", error);
      }
    }, 10000); // Poll every 10 seconds
  }

  async function playArtist() {
    if (topSongs.length > 0) {
      playQueue(topSongs, 0, {
        type: "artist",
        id: artist.id,
        name: artist.name,
      });
    }
  }

  async function shuffleArtist() {
    if (topSongs.length > 0) {
      playQueueShuffled(topSongs);
    }
  }

  /**
   * Toggle starred status for the album
   * @param {any} albumToToggle
   * @param {Event} event
   */
  async function toggleAlbumFavorite(albumToToggle, event) {
    if (event) event.stopPropagation();
  }

  /**
   * Toggle starred status for the main artist
   * @param {Event} event
   */
  async function toggleArtistFavorite(event) {
    event.stopPropagation();
    try {
      if (artist.starred) {
        await unstarAlbum(artist.id);
        artist.starred = undefined;
      } else {
        await starAlbum(artist.id);
        artist.starred = new Date().toISOString();
      }
      artist = artist;
    } catch (e) {
      console.error(e);
    }
  }
</script>

{#if loading}
  <div class="flex items-center justify-center h-full text-gray-500">
    Loading...
  </div>
{:else if artist}
  <div class="flex flex-col gap-8">
    <!-- BACK BUTTON -->
    <BackButton />

    <!-- HEADER -->
    <div
      class="flex flex-col md:flex-row gap-8 items-center md:items-end lg:items-end"
    >
      <img
        src={getCoverArtUrl(artist.id)}
        alt={artist.name}
        class="w-64 h-64 rounded-lg shadow-2xl object-cover bg-[var(--bg-card)]"
      />
      <div class="flex flex-col gap-4 mb-2">
        <span
          class="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)] inline-flex items-center gap-2"
          ><Mic2 size={24} /> Artist</span
        >
        <h1 class="text-5xl font-bold text-[var(--text-primary)]">
          {artist.name}
        </h1>
        <div class="flex items-center gap-2 text-[var(--text-secondary)]">
          {#if artist.artist}
            <span class="font-semibold text-[var(--text-primary)]"
              >{artist.artist}</span
            >
            <span>•</span>
          {/if}
          <span>{artist.albumCount} albums</span>
        </div>
      </div>
    </div>

    <!-- ACTIONS -->
    <div class="flex items-center gap-4">
      <button
        onclick={playArtist}
        class="bg-[var(--accent)] text-[var(--accent-fg)] rounded-full p-4 hover:scale-105 transition-transform shadow-lg flex items-center justify-center"
        title="Play Artist (Top Songs)"
      >
        <Play size={28} fill="currentColor" class="ml-1" />
      </button>
      <button
        onclick={shuffleArtist}
        class="bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-primary)] rounded-full p-4 hover:bg-[var(--bg-hover)] transition-colors shadow-lg flex items-center justify-center"
        title="Shuffle Artist (Top Songs)"
      >
        <Shuffle size={24} />
      </button>
      <button
        onclick={toggleArtistFavorite}
        class="bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-primary)] rounded-full p-4 hover:bg-[var(--bg-hover)] transition-colors shadow-lg flex items-center justify-center"
        title={artist.starred ? "Unfavorite Artist" : "Favorite Artist"}
      >
        <Heart
          size={24}
          class={artist.starred
            ? "text-red-500 fill-red-500"
            : "text-[var(--text-secondary)]"}
        />
      </button>
    </div>

    <!-- Top Songs List -->
    {#if topSongs.length > 0}
      <div class="container mx-auto">
        <h1 class="text-2xl font-bold mt-6 mb-6">Top Songs</h1>
        <SongList
          songs={topSongs.slice(0, 10)}
          context="artist"
          contextId={artist.id}
          contextName={artist.name}
        />
      </div>
    {/if}

    <!-- Album List -->
    <div class="container mx-auto">
      <h1 class="text-2xl font-bold mt-6 mb-6">All Albums</h1>
      <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {#each artist.album as album, i}
          <AlbumCard bind:album={artist.album[i]} />
        {/each}
      </div>
    </div>

    <!-- Similar Artists -->
    <SimilarArtists artistId={artist.id} />
  </div>
{:else}
  <div class="text-center text-red-500">Artist not found</div>
{/if}
