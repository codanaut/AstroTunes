<script>
  import { onMount, onDestroy } from "svelte";
  import { subsonicFetch } from "../lib/subsonic.js";
  import { PlugZap, Disc, Mic2, Music } from "lucide-svelte";
  import { auth } from "../lib/auth";
  import SectionWrapper from "../lib/components/SectionWrapper.svelte";

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
        href="/settings"
        class="bg-[var(--accent)] hover:opacity-90 text-[var(--accent-fg)] font-bold py-3 px-8 rounded-full transition-all inline-flex items-center gap-2 shadow-lg hover:scale-105"
      >
        Connect Now
      </a>
    </div>
  {:else}
    <h2 class="text-3xl font-bold text-[var(--accent)] mb-2 text-center">
      Favorites
    </h2>
    <div class="flex flex-row gap-4 justify-center my-6">
      <a href="/favorites/songs">
        <Music size={48} class="text-[var(--accent)]" />
      </a>
      <a href="/favorites/albums">
        <Disc size={48} class="text-[var(--accent)]" />
      </a>
      <a href="/favorites/artists">
        <Mic2 size={48} class="text-[var(--accent)]" />
      </a>
    </div>

    <SectionWrapper
      title="Top Played Albums"
      items={topAlbums}
      type="album"
      showAllLink="/albums/top"
      enableViewToggle={true}
    />

    <!--
    <SectionWrapper
      title="Favorite Albums"
      items={favlist}
      type="album"
      showAllLink="/favorites/albums"
      enableViewToggle={true}
    />-->

    <SectionWrapper
      title="Recently Added Albums"
      items={recentlyAddedAlbums}
      type="album"
      showAllLink="/albums/recent"
      enableViewToggle={true}
    />

    <SectionWrapper
      title="Random Albums"
      items={albums}
      type="album"
      showAllLink="/albums/random"
      enableViewToggle={true}
    />
  {/if}
</div>
<!-- end container -->
