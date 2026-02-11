<script>
  import { onMount, onDestroy } from "svelte";
  import { subsonicFetch } from "../lib/subsonic.js";
  import { PlugZap, Disc, Mic2, Music, ListMusic } from "lucide-svelte";
  import { auth } from "../lib/auth";
  import SectionWrapper from "../lib/components/SectionWrapper.svelte";
  import { resolve } from "$app/paths";

  /** @type {any[]} */
  let albums = [];
  /** @type {any[]} */
  let favlist = [];
  /** @type {any[]} */
  let recentlyAddedAlbums = [];
  /** @type {any[]} */
  let topAlbums = [];

  onMount(async () => {
    const data = await subsonicFetch("getAlbumList", "&type=random&size=5");
    if (data && data.albumList && data.albumList.album) {
      albums = data.albumList.album;
    }
    const favs = await subsonicFetch("getAlbumList", "&type=starred&size=5");
    if (favs && favs.albumList && favs.albumList.album) {
      favlist = favs.albumList.album;
    }
    const recentlyAddedAlbumsData = await subsonicFetch(
      "getAlbumList",
      "&type=newest&size=5",
    );
    if (
      recentlyAddedAlbumsData &&
      recentlyAddedAlbumsData.albumList &&
      recentlyAddedAlbumsData.albumList.album
    ) {
      recentlyAddedAlbums = recentlyAddedAlbumsData.albumList.album;
    }
    const topAlbumsData = await subsonicFetch(
      "getAlbumList",
      "&type=frequent&size=5",
    );
    if (
      topAlbumsData &&
      topAlbumsData.albumList &&
      topAlbumsData.albumList.album
    ) {
      topAlbums = topAlbumsData.albumList.album;
    }
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
      // Sync Favorites
      const favs = await subsonicFetch("getAlbumList", "&type=starred&size=5");
      if (favs && favs.albumList && favs.albumList.album) {
        favlist = favs.albumList.album;
      }

      // Sync Recently Added Albums
      const recentlyAddedAlbumsData = await subsonicFetch(
        "getAlbumList",
        "&type=newest&size=5",
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
        "&type=frequent&size=5",
      );
      if (
        topAlbumsData &&
        topAlbumsData.albumList &&
        topAlbumsData.albumList.album
      ) {
        topAlbums = topAlbumsData.albumList.album;
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
    <div class="w-full px-6 py-8">
      <!-- Section Title
      <h2 class="text-2xl font-bold text-[var(--accent)] mb-6">
        Your Collections
      </h2>
      -->

      <!-- Cards Grid -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
        <!-- Favorite Songs Card -->
        <a
          href={resolve("/favorites/songs")}
          class="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)]"
        >
          <div class="flex items-center justify-between relative z-10">
            <div>
              <h3 class="text-xl font-bold text-white mb-1">Favorite Songs</h3>
              <p class="text-sm text-gray-400">All your liked tracks</p>
            </div>
            <div
              class="text-[var(--accent)] group-hover:scale-110 transition-transform duration-300"
            >
              <Music size={32} />
            </div>
          </div>
          <!-- Subtle Glow Effect on Hover -->
          <div
            class="absolute inset-0 bg-gradient-to-br from-[var(--accent)]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          ></div>
        </a>

        <!-- Favorite Albums Card -->
        <a
          href={resolve("/favorites/albums")}
          class="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)]"
        >
          <div class="flex items-center justify-between relative z-10">
            <div>
              <h3 class="text-xl font-bold text-white mb-1">Favorite Albums</h3>
              <p class="text-sm text-gray-400">Saved full-length records</p>
            </div>
            <div
              class="text-[var(--accent)] group-hover:scale-110 transition-transform duration-300"
            >
              <Disc size={32} />
            </div>
          </div>
          <div
            class="absolute inset-0 bg-gradient-to-br from-[var(--accent)]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          ></div>
        </a>

        <!-- Favorite Artists Card -->
        <a
          href={resolve("/favorites/artists")}
          class="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)]"
        >
          <div class="flex items-center justify-between relative z-10">
            <div>
              <h3 class="text-xl font-bold text-white mb-1">
                Favorite Artists
              </h3>
              <p class="text-sm text-gray-400">Your top performers</p>
            </div>
            <div
              class="text-[var(--accent)] group-hover:scale-110 transition-transform duration-300"
            >
              <Mic2 size={32} />
            </div>
          </div>
          <div
            class="absolute inset-0 bg-gradient-to-br from-[var(--accent)]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          ></div>
        </a>

        <!-- Playlists Card -->
        <a
          href={resolve("/playlists")}
          class="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)]"
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
        </a>
      </div>
    </div>

    <SectionWrapper
      title="Top Played Albums"
      items={topAlbums}
      type="album"
      showAllLink={resolve("/albums/top")}
      enableViewToggle={true}
    />

    <!--
    <SectionWrapper
      title="Favorite Albums"
      items={favlist}
      type="album"
      showAllLink={resolve("/favorites/albums")}
      enableViewToggle={true}
    />-->

    <SectionWrapper
      title="Recently Added Albums"
      items={recentlyAddedAlbums}
      type="album"
      showAllLink={resolve("/albums/recent")}
      enableViewToggle={true}
    />

    <SectionWrapper
      title="Discover"
      items={albums}
      type="album"
      showAllLink={resolve("/albums/random")}
      enableViewToggle={true}
    />
  {/if}
</div>
<!-- end container -->
