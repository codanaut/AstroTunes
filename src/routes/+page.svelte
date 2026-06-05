<script>
  import { onMount, onDestroy } from "svelte";
  import { subsonicFetch } from "../lib/subsonic.js";
  import { PlugZap, Disc, Mic2, Music, ListMusic } from "lucide-svelte";
  import { auth } from "../lib/auth";
  import SectionWrapper from "../lib/components/SectionWrapper.svelte";
  import AlbumList from "../lib/components/AlbumList.svelte";
  import SongList from "$lib/components/SongList.svelte";
  import { resolve } from "$app/paths";
  import { libraryStore, musicFolderParam } from "../lib/stores/library.js";

  /** @type {any[]} */
  let albums = $state([]);
  /** @type {any[]} */
  let favlist = $state([]);
  /** @type {any[]} */
  let recentlyAddedAlbums = $state([]);
  /** @type {any[]} */
  let topAlbums = $state([]);
  /** @type {any[]} */
  let albums2026 = $state([]);
  /** @type {any[]} */
  let topSongs = $state([]);

  // Reactive: re-fetch whenever the selected library changes (or on mount)
  $effect(() => {
    // Track selectedId so this effect re-runs on library change
    const folderParam = musicFolderParam($libraryStore.selectedId);
    if ($auth.isConnected) {
      loadAllSections(folderParam);
    }
  });

  async function loadAllSections(folderParam = "") {
    const [
      data,
      favs,
      recentlyAddedAlbumsData,
      topAlbumsData,
      albums2026Data,
      starredData,
    ] = await Promise.all([
      subsonicFetch("getAlbumList", `&type=random&size=5${folderParam}`),
      subsonicFetch("getAlbumList", `&type=starred&size=5${folderParam}`),
      subsonicFetch("getAlbumList", `&type=newest&size=5${folderParam}`),
      subsonicFetch("getAlbumList", `&type=frequent&size=5${folderParam}`),
      subsonicFetch(
        "getAlbumList",
        `&type=byYear&fromYear=2026&toYear=2026&size=5${folderParam}`,
      ),
      subsonicFetch("getStarred"),
    ]);

    if (data?.albumList?.album) albums = data.albumList.album;
    if (favs?.albumList?.album) favlist = favs.albumList.album;
    if (recentlyAddedAlbumsData?.albumList?.album)
      recentlyAddedAlbums = recentlyAddedAlbumsData.albumList.album;
    if (topAlbumsData?.albumList?.album)
      topAlbums = topAlbumsData.albumList.album;
    if (albums2026Data?.albumList?.album)
      albums2026 = albums2026Data.albumList.album;

    if (starredData && starredData.starred?.song) {
      /** @type {any[]} */
      let starredSongs = starredData.starred.song;
      topSongs = starredSongs
        .sort((a, b) => b.playCount - a.playCount)
        .slice(0, 5);
    }

    startSyncLoop();
  }

  onMount(() => {
    // nothing needed — the $effect handles initial load
  });

  onDestroy(() => {
    if (syncInterval) clearInterval(syncInterval);
  });

  /** @type {any} */
  let syncInterval;

  function startSyncLoop() {
    if (syncInterval) clearInterval(syncInterval);
    syncInterval = setInterval(async () => {
      const folderParam = musicFolderParam($libraryStore.selectedId);

      // Sync Favorites
      const favs = await subsonicFetch(
        "getAlbumList",
        `&type=starred&size=5${folderParam}`,
      );
      if (favs && favs.albumList && favs.albumList.album) {
        favlist = favs.albumList.album;
      }

      // Sync Recently Added Albums
      const recentlyAddedAlbumsData = await subsonicFetch(
        "getAlbumList",
        `&type=newest&size=5${folderParam}`,
      );
      if (
        recentlyAddedAlbumsData &&
        recentlyAddedAlbumsData.albumList &&
        recentlyAddedAlbumsData.albumList.album
      ) {
        recentlyAddedAlbums = recentlyAddedAlbumsData.albumList.album;
      }

      // Sync Top Played Albums
      const topAlbumsData = await subsonicFetch(
        "getAlbumList",
        `&type=frequent&size=5${folderParam}`,
      );
      if (
        topAlbumsData &&
        topAlbumsData.albumList &&
        topAlbumsData.albumList.album
      ) {
        topAlbums = topAlbumsData.albumList.album;
      }

      const albums2026Data = await subsonicFetch(
        "getAlbumList",
        `&type=byYear&fromYear=2026&toYear=2026&size=5${folderParam}`,
      );
      if (
        albums2026Data &&
        albums2026Data.albumList &&
        albums2026Data.albumList.album
      ) {
        albums2026 = albums2026Data.albumList.album;
      }

      // Note: We don't sync 'random' albums because fetching them again would change the albums shown.
    }, 10000);
  }
</script>

<div class="container mx-auto pb-[15%] md:pb-[7%]">
  {#if !$auth.isConnected}
    <div
      class="flex flex-col items-center justify-center min-h-[60vh] text-center px-4"
    >
      <div
        class="w-24 h-24 bg-[var(--bg-card)] rounded-full flex items-center justify-center mb-6"
      >
        <PlugZap size={48} class="text-[var(--text-muted)]" />
      </div>
      <h2 class="text-3xl font-bold text-[var(--text-primary)] mb-2">
        Not Connected
      </h2>
      <p class="text-[var(--text-secondary)] max-w-md mb-8">
        Connect to your server to access your music library, favorites, and
        playlists.
      </p>
      <a
        href={resolve("/settings")}
        class="bg-[var(--accent)] hover:opacity-90 text-[var(--accent-fg)] font-bold py-3 px-8 rounded-full transition-all inline-flex items-center gap-2 shadow-lg hover:scale-105"
      >
        Connect Now
      </a>
    </div>
  {:else}
    <div class="w-full lg:max-w-[80%] mx-auto">
      <!-- Cards Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Favorite Songs Card -->
        <a
          href={resolve("/favorites/songs")}
          class="group relative overflow-hidden rounded-2xl border border-[var(--border-glass)] bg-[var(--bg-glass)] p-8 backdrop-blur-md transition-all duration-500 hover:shadow-[var(--theme-glow)] hover:scale-[1.02]"
        >
          <!-- Asymmetrical Icon -->
          <div
            class="absolute -left-4 -bottom-4 opacity-10 text-[var(--accent)] group-hover:opacity-20 transition-opacity duration-500"
          >
            <Music size={120} />
          </div>

          <div class="flex flex-col relative z-10 h-full justify-center">
            <h3 class="text-2xl font-bold text-[var(--text-primary)] mb-1">
              Favorite Songs
            </h3>
            <p class="text-sm text-[var(--text-muted)]">
              All your liked tracks
            </p>
          </div>

          <div
            class="absolute top-6 right-6 text-[var(--accent)] opacity-50 group-hover:opacity-100 transition-opacity"
          >
            <Music size={24} />
          </div>

          <!-- Subtle Glow Effect on Hover -->
          <div
            class="absolute inset-0 bg-gradient-to-br from-[var(--accent)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          ></div>
        </a>

        <!-- Favorite Albums Card -->
        <a
          href={resolve("/favorites/albums")}
          class="group relative overflow-hidden rounded-2xl border border-[var(--border-glass)] bg-[var(--bg-glass)] p-8 backdrop-blur-md transition-all duration-500 hover:shadow-[var(--theme-glow)] hover:scale-[1.02]"
        >
          <!-- Asymmetrical Icon -->
          <div
            class="absolute -left-4 -bottom-4 opacity-10 text-[var(--accent)] group-hover:opacity-20 transition-opacity duration-500"
          >
            <Disc size={120} />
          </div>

          <div class="flex flex-col relative z-10 h-full justify-center">
            <h3 class="text-2xl font-bold text-[var(--text-primary)] mb-1">
              Favorite Albums
            </h3>
            <p class="text-sm text-[var(--text-muted)]">Your favorite albums</p>
          </div>

          <div
            class="absolute top-6 right-6 text-[var(--accent)] opacity-50 group-hover:opacity-100 transition-opacity"
          >
            <Disc size={24} />
          </div>

          <div
            class="absolute inset-0 bg-gradient-to-br from-[var(--accent)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          ></div>
        </a>

        <!-- Favorite Artists Card -->
        <a
          href={resolve("/favorites/artists")}
          class="group relative overflow-hidden rounded-2xl border border-[var(--border-glass)] bg-[var(--bg-glass)] p-8 backdrop-blur-md transition-all duration-500 hover:shadow-[var(--theme-glow)] hover:scale-[1.02]"
        >
          <!-- Asymmetrical Icon -->
          <div
            class="absolute -left-4 -bottom-4 opacity-10 text-[var(--accent)] group-hover:opacity-20 transition-opacity duration-500"
          >
            <Mic2 size={120} />
          </div>

          <div class="flex flex-col relative z-10 h-full justify-center">
            <h3 class="text-2xl font-bold text-[var(--text-primary)] mb-1">
              Favorite Artists
            </h3>
            <p class="text-sm text-[var(--text-muted)]">
              Your favorite artists
            </p>
          </div>

          <div
            class="absolute top-6 right-6 text-[var(--accent)] opacity-50 group-hover:opacity-100 transition-opacity"
          >
            <Mic2 size={24} />
          </div>

          <div
            class="absolute inset-0 bg-gradient-to-br from-[var(--accent)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          ></div>
        </a>

        <!-- Playlists Card -->
        <!--
        <a
          href={resolve("/playlists")}
          class="group relative overflow-hidden rounded-2xl border border-white/10 bg-[var(--bg-sidebar)] p-6 backdrop-blur-md transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)]"
        >
          <div class="flex items-center justify-between relative z-10">
            <div>
              <h3 class="text-xl font-bold text-white mb-1">Playlists</h3>
              <p class="text-sm text-gray-400">Your playlists</p>
            </div>
            <div
              class="text-[var(--accent)] group-hover:scale-110 transition-transform duration-300"
            >
              <ListMusic size={32} />
            </div>
          </div>
          <div
            class="absolute inset-0 bg-gradient-to-br from-[var(--accent)]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          ></div>
        </a>-->
      </div>
    </div>

    <!--<div class="w-full lg:max-w-[80%] mx-auto">
      <SectionWrapper
        title="Top Played Albums"
        items={topAlbums}
        type="album"
        showAllLink={resolve("/albums/top")}
        enableViewToggle={false}
        layout="featured"
        headerClass=""
      />
    </div>-->

    <!--
    <SectionWrapper
      title="Favorite Albums"
      items={favlist}
      type="album"
      showAllLink={resolve("/favorites/albums")}
      enableViewToggle={true}
    />-->

    <!-- New Side-by-Side Dashboard Section -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-8 my-8 px-4 sm:px-6">
      <!-- Left Column: Top Songs -->
      <div class="flex flex-col gap-4">
        <div class="flex justify-between items-center mx-auto">
          <h2 class="text-xl font-bold tracking-tight text-[var(--text-main)]">
            <a
              href={resolve("/favorites/songs")}
              class="hover:text-[var(--accent)] hover:underline">Top Songs</a
            >
          </h2>
          <!--<a
            href="/favorites/songs"
            class="text-sm font-semibold text-[var(--accent)] hover:underline"
            >Show More</a
          >-->
        </div>

        <!-- Renders the top 5 song rows -->
        {#if topSongs && topSongs.length > 0}
          <SongList
            songs={topSongs.slice(0, 5)}
            showToolbar={false}
            context="homescreen"
          />
        {:else}
          <div class="text-sm text-[var(--text-muted)] py-4">
            No top songs available.
          </div>
        {/if}
      </div>

      <!-- Right Column: Top Albums -->
      <div class="flex flex-col gap-4">
        <div class="flex justify-between items-center mx-auto">
          <h2 class="text-xl font-bold tracking-tight text-[var(--text-main)]">
            <a
              href={resolve("/favorites/albums")}
              class="hover:text-[var(--accent)] hover:underline">Top Albums</a
            >
          </h2>
          <!--<a
            href="/favorites/albums"
            class="text-sm font-semibold text-[var(--accent)] hover:underline"
            >Show More</a
          >-->
        </div>

        <!-- Option A: Renders as a clean vertical list matching the songs layout -->
        {#if topAlbums && topAlbums.length > 0}
          <AlbumList albums={topAlbums.slice(0, 5)} />
        {:else}
          <div class="text-sm text-[var(--text-muted)] py-4">
            No top albums available.
          </div>
        {/if}
      </div>
    </div>

    <SectionWrapper
      title="Recently Added"
      items={recentlyAddedAlbums}
      type="album"
      showAllLink={resolve("/albums/recent")}
      enableViewToggle={false}
    />

    <SectionWrapper
      title="Discover"
      items={albums}
      type="album"
      showAllLink={resolve("/albums/random")}
      enableViewToggle={false}
    />

    <SectionWrapper
      title="2026 Releases"
      items={albums2026}
      type="album"
      showAllLink={resolve("/albums/this-year")}
      enableViewToggle={false}
    />
  {/if}
</div>
<!-- end container -->
