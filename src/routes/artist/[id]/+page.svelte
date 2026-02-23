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
    search,
    getArtistInfo,
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
  let artist = $state(null);
  /** @type {any[]} */
  let topSongs = $state([]);
  /** @type {any[]} */
  let appearsOnAlbums = $state([]);
  /** @type {any} */
  let artistInfo = $state(null);
  let loading = $state(true);
  let showFullBio = $state(false);
  /** @type {any} */
  let syncInterval;

  // Reactively load artist data when the ID changes
  $effect(() => {
    if ($page.params.id) {
      loadArtist($page.params.id);
    }
  });

  /**
   * @param {string} artistId
   */
  async function loadArtist(artistId) {
    loading = true;
    artist = null; // Reset artist
    appearsOnAlbums = [];
    const data = await subsonicFetch("getArtist", `&id=${artistId}`);
    if (data && data.artist) {
      artist = data.artist;

      // Fetch additional artist info (bio, etc)
      const infoData = await getArtistInfo(artistId);
      if (infoData && infoData.artistInfo2) {
        artistInfo = infoData.artistInfo2;
      }

      // Fetch top songs
      const topSongsData = await getTopSongs(artist.name);
      //console.log(topSongsData);
      if (topSongsData && topSongsData.topSongs && topSongsData.topSongs.song) {
        topSongs = Array.isArray(topSongsData.topSongs.song)
          ? topSongsData.topSongs.song
          : [topSongsData.topSongs.song];
      } else {
        topSongs = [];
      }

      // Process Appears On Albums
      const artistAlbums = artist.album
        ? Array.isArray(artist.album)
          ? artist.album
          : [artist.album]
        : [];

      const ownAlbumIds = new Set(
        artistAlbums.map((/** @type {{ id: any; }} */ a) => String(a.id)),
      );
      const appearsOnMap = new Map();

      // 1. Check Top Songs for features (existing logic)
      if (topSongs.length > 0) {
        topSongs.forEach((song) => {
          if (song.albumId && !ownAlbumIds.has(song.albumId)) {
            if (!appearsOnMap.has(song.albumId)) {
              appearsOnMap.set(song.albumId, {
                id: song.albumId,
                title: song.album,
                artist: song.artist,
                artistId: song.artistId,
                coverArt: song.coverArt,
              });
            }
          }
        });
      }

      // 2. Comprehensive Search for Features
      // We search for the artist name to find songs where they might be "featured"
      // This is necessary because getArtist only returns albums where they are the ALBUM ARTIST
      try {
        // Fetch more results to increase chance of finding features
        const searchResults = await search(artist.name, 0, 500);
        console.log(searchResults);

        if (
          searchResults &&
          searchResults.searchResult3 &&
          searchResults.searchResult3.song
        ) {
          const rawSongs = searchResults.searchResult3.song;
          const songs = Array.isArray(rawSongs) ? rawSongs : [rawSongs];

          songs.forEach((/** @type {any} */ song) => {
            if (song.albumId && !ownAlbumIds.has(song.albumId)) {
              // Avoid duplicates
              if (!appearsOnMap.has(song.albumId)) {
                // ROBUST CHECK:
                // Check if 'artists' array exists and contains our artist ID
                let isFeatured = false;

                // 1. Precise ID Check
                if (song.artists && Array.isArray(song.artists)) {
                  if (
                    song.artists.some(
                      (/** @type {{ id: any; }} */ a) => a.id === artist.id,
                    )
                  ) {
                    isFeatured = true;
                  }
                }

                // 2. Fallback / Supplemental String Check
                // (Crucial for cases where metadata might be incomplete or the search returned song objects without populated artists array)
                if (!isFeatured) {
                  const artistNameLower = artist.name.toLowerCase();
                  const songArtistLower = (song.artist || "").toLowerCase();
                  if (songArtistLower.includes(artistNameLower)) {
                    isFeatured = true;
                  }
                }

                if (isFeatured) {
                  appearsOnMap.set(song.albumId, {
                    id: song.albumId,
                    title: song.album,
                    artist: song.artist,
                    artistId: song.artistId,
                    coverArt: song.coverArt,
                  });
                }
              }
            }
          });
        }
      } catch (e) {
        console.error("Failed to fetch comprehensive appears on:", e);
      }

      appearsOnAlbums = Array.from(appearsOnMap.values());
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
  <div class="flex flex-col gap-8 pb-[30%] md:pb-[10%]">
    <!-- BACK BUTTON -->
    <BackButton />

    <!-- HEADER -->
    <div
      class="flex flex-col md:flex-row gap-8 items-center md:items-end lg:items-end"
    >
      <img
        src={getCoverArtUrl(artist.id)}
        alt={artist.name}
        class="w-64 h-64 rounded-full shadow-2xl object-cover bg-[var(--bg-card)] border-4 border-[var(--border-glass)]"
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

    <!-- ARTIST BIO SECTION -->
    {#if artistInfo && artistInfo.biography}
      <div
        class="bg-[var(--bg-card)] border border-[var(--border-glass)] rounded-2xl p-6 backdrop-blur-md shadow-xl transition-all duration-300"
      >
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-bold text-[var(--text-primary)]">About</h2>
            <div class="flex items-center gap-3">
              {#if artistInfo.lastFmUrl}
                <a
                  href={artistInfo.lastFmUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-[var(--text-secondary)] hover:text-[#D51007] transition-all hover:scale-110 flex items-center justify-center"
                  title="View on Last.fm"
                >
                  <svg
                    viewBox="-271 324 256 154"
                    class="w-6 h-6"
                    fill="currentColor"
                  >
                    <path
                      d="M-54.3,387.3c-2.2-0.7-4.4-1.4-6.5-2.1c-15.9-5-25.5-8-25.5-20.4c0-10.1,7.8-17.4,18.5-17.4c8.2,0,14.3,3.4,19.8,11.1 c0.5,0.7,1.5,1,2.3,0.6l15.9-8.3c0.4-0.2,0.8-0.6,0.9-1.1s0.1-1-0.2-1.4c-8.6-15.3-21-22.7-38-22.7c-25.8,0-42.4,15.6-42.4,39.7 c0,24.7,16.1,34.7,45.8,44.4c17.2,5.7,24.8,8.8,24.8,21c0,13.8-12.4,23.7-29.4,23.1c-17.8-0.6-23.2-10-29.9-25.4 c-11.5-26.1-24.5-56.6-24.6-56.9c-13.1-30.2-39-47.5-71.2-47.5c-42.5,0-77,34.5-77,77s34.5,77,77,77c23.2,0,44.9-10.3,59.5-28.2 c0.4-0.5,0.5-1.2,0.3-1.8l-9.7-22.4c-0.3-0.6-0.9-1-1.6-1.1c-0.7,0-1.3,0.4-1.7,1c-9.2,17.5-27.1,28.4-46.9,28.4 c-29.1,0-52.8-23.7-52.8-52.9c0-29.1,23.7-52.9,52.8-52.9c21.2,0,40.6,12.6,48.4,31.4l24,54.8l2.8,6.2 c10.9,25.3,26.8,36.6,51.8,36.7c29.7,0,52.1-19.7,52.1-45.8C-14.8,405.3-29.3,395.4-54.3,387.3z"
                    />
                  </svg>
                </a>
              {/if}
              {#if artistInfo.musicBrainzId}
                <a
                  href={`https://musicbrainz.org/artist/${artistInfo.musicBrainzId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-[var(--text-secondary)] hover:text-[#EB743B] transition-all hover:scale-110 flex items-center justify-center"
                  title="View on MusicBrainz"
                >
                  <svg viewBox="0 0 24 24" class="w-6 h-6" fill="currentColor">
                    <path
                      d="M11.582 0L1.418 5.832v12.336L11.582 24V10.01L7.1 12.668v3.664c.01.111.01.225 0 .336-.103.435-.54.804-1 1.111-.802.537-1.752.509-2.166-.111-.413-.62-.141-1.631.666-2.168.384-.28.863-.399 1.334-.332V6.619c0-.154.134-.252.226-.308L11.582 3zm.836 0v6.162c.574.03 1.14.16 1.668.387a2.225 2.225 0 0 0 1.656-.717 1.02 1.02 0 1 1 1.832-.803l.004.006a1.022 1.022 0 0 1-1.295 1.197c-.34.403-.792.698-1.297.85.34.263.641.576.891.928a1.04 1.04 0 0 1 .777.125c.768.486.568 1.657-.318 1.857-.886.2-1.574-.77-1.09-1.539.02-.03.042-.06.065-.09a3.598 3.598 0 0 0-1.436-1.166 4.142 4.142 0 0 0-1.457-.369v4.01c.855.06 1.256.493 1.555.834.227.256.356.39.578.402.323.018.568.008.806 0a5.44 5.44 0 0 1 .895.022c.94-.017 1.272-.226 1.605-.446a2.533 2.533 0 0 1 1.131-.463 1.027 1.027 0 0 1 .12-.263 1.04 1.04 0 0 1 .105-.137c.023-.025.047-.044.07-.066a4.775 4.775 0 0 1 0-2.405l-.012-.01a1.02 1.02 0 1 1 .692.272h-.057a4.288 4.288 0 0 0 0 1.877h.063a1.02 1.02 0 1 1-.545 1.883l-.047-.033a1 1 0 0 1-.352-.442 1.885 1.885 0 0 0-.814.354 3.03 3.03 0 0 1-.703.365c.757.555 1.772 1.6 2.199 2.299a1.03 1.03 0 0 1 .256-.033 1.02 1.02 0 1 1-.545 1.88l-.047-.03a1.017 1.017 0 0 1-.27-1.376.72.72 0 0 1 .051-.072c-.445-.775-2.026-2.28-2.46-2.387a4.037 4.037 0 0 0-1.31-.117c-.24.008-.513.018-.866 0-.515-.027-.783-.333-1.043-.629-.26-.296-.51-.56-1.055-.611V18.5a1.877 1.877 0 0 0 .426-.135.333.333 0 0 1 .058-.027c.56-.267 1.421-.91 2.096-2.447a1.02 1.02 0 0 1-.27-1.344 1.02 1.02 0 1 1 .915 1.54 6.273 6.273 0 0 1-1.432 2.136 1.785 1.785 0 0 1 .691.306.667.667 0 0 0 .37.168 3.31 3.31 0 0 0 .888-.222 1.02 1.02 0 0 1 1.787-.79v-.005a1.02 1.02 0 0 1-.773 1.683 1.022 1.022 0 0 1-.719-.287 3.935 3.935 0 0 1-1.168.287h-.05a1.313 1.313 0 0 1-.71-.275c-.262-.177-.51-.345-1.402-.12a2.098 2.098 0 0 1-.707.2V24l10.164-5.832V5.832zm4.154 4.904a.352.352 0 0 0-.197.639l.018.01c.163.1.378.053.484-.108v-.002a.352.352 0 0 0-.303-.539zm-4.99 1.928L7.082 9.5v2l4.5-2.668zm8.385.38a.352.352 0 0 0-.295.165v.002a.35.35 0 0 0 .096.473l.013.01a.357.357 0 0 0 .487-.108.352.352 0 0 0-.301-.541zM16.09 8.647a.352.352 0 0 0-.277.163.355.355 0 0 0 .296.54c.482 0 .463-.73-.02-.703zm3.877 2.477a.352.352 0 0 0-.295.164.35.35 0 0 0 .094.475l.015.01a.357.357 0 0 0 .485-.11.352.352 0 0 0-.3-.539zm-4.375 3.594a.352.352 0 0 0-.291.172.35.35 0 0 0-.04.265.352.352 0 1 0 .33-.437zm4.375.789a.352.352 0 0 0-.295.164v.002a.352.352 0 0 0 .094.473l.015.01a.357.357 0 0 0 .485-.108.352.352 0 0 0-.3-.54zm-2.803 2.488v.002a.347.347 0 0 0-.223.084.352.352 0 0 0 .23.62.347.347 0 0 0 .23-.085.348.348 0 0 0 .12-.24.353.353 0 0 0-.35-.38.347.347 0 0 0-.007 0Z"
                    />
                  </svg>
                </a>
              {/if}
            </div>
          </div>

          <div class="relative">
            <div
              class="text-[var(--text-secondary)] leading-relaxed prose prose-invert max-w-none transition-all duration-500 overflow-hidden"
              style={showFullBio ? "" : "max-height: 100px;"}
            >
              {@html artistInfo.biography}
            </div>

            {#if !showFullBio && artistInfo.biography.length > 200}
              <div
                class="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[var(--bg-card)] to-transparent"
              ></div>
            {/if}
          </div>

          {#if artistInfo.biography.length > 200}
            <button
              onclick={() => (showFullBio = !showFullBio)}
              class="text-[var(--accent)] text-sm font-semibold hover:underline w-fit"
            >
              {showFullBio ? "Show Less" : "Read More"}
            </button>
          {/if}
        </div>
      </div>
    {/if}

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
          showToolbar={false}
        />
      </div>
    {/if}

    <!-- Album List -->
    {#if artist.album && artist.album.length > 0}
      <div class="container mx-auto">
        <h1 class="text-2xl font-bold mt-6 mb-6">All Albums</h1>
        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {#each artist.album as album, i}
            <AlbumCard album={artist.album[i]} />
          {/each}
        </div>
      </div>
    {/if}

    <!-- Appears On -->
    {#if appearsOnAlbums.length > 0}
      <div class="container mx-auto">
        <h1 class="text-2xl font-bold mt-6 mb-6">Appears On</h1>
        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {#each appearsOnAlbums as album}
            <AlbumCard {album} />
          {/each}
        </div>
      </div>
    {/if}

    <!-- Similar Artists -->
    <SimilarArtists artistId={artist.id} />
  </div>
{:else}
  <div class="text-center text-red-500">Artist not found</div>
{/if}
