<script>
    import { page } from "$app/stores";
    import { getAlbums } from "../../../lib/subsonic.js";
    import BackButton from "../../../lib/components/BackButton.svelte";
    import SectionWrapper from "../../../lib/components/SectionWrapper.svelte";
    import { onMount, onDestroy } from "svelte";

    /** @type {any[]} */
    let albums = $state([]);
    let loading = $state(true);
    const limit = 50;
    const baseUrl = "/albums/this-year";
    /** @type {any} */
    let syncInterval;

    let currentPage = $derived(Number($page.url.searchParams.get("page")) || 1);
    let offset = $derived((currentPage - 1) * limit);

    async function loadAlbums(silent = false) {
        if (!silent) loading = true;
        try {
            const albumsData = await getAlbums(
                offset,
                limit,
                "byYear&fromYear=2026&toYear=2026",
            );

            if (
                albumsData &&
                albumsData.albumList &&
                albumsData.albumList.album
            ) {
                albums = albumsData.albumList.album;
            } else {
                albums = [];
            }
        } catch (e) {
            console.error("Error loading albums:", e);
        } finally {
            if (!silent) loading = false;
        }
    }

    function startSyncLoop() {
        if (syncInterval) clearInterval(syncInterval);
        syncInterval = setInterval(() => {
            loadAlbums(true);
        }, 10000);
    }

    onMount(() => {
        loadAlbums();
        startSyncLoop();
    });

    onDestroy(() => {
        if (syncInterval) clearInterval(syncInterval);
    });

    $effect(() => {
        if (currentPage) {
            // When page changes, we want to show loading state
            loadAlbums(false);
        }
    });
</script>

<div class="container mx-auto pb-24 px-4">
    <BackButton />
    {#if loading}
        <div class="flex justify-center items-center h-64">
            <div
                class="animate-spin rounded-full h-8 w-8 border-b-2 border-white"
            ></div>
        </div>
    {:else}
        <SectionWrapper
            title="2026 Releases"
            items={albums}
            type="album"
            {currentPage}
            {limit}
            {baseUrl}
            enableViewToggle={true}
            totalItems={500}
        />
    {/if}
</div>
