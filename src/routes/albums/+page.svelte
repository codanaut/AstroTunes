<script>
    import { onMount } from "svelte";
    import { page } from "$app/stores";
    import { getAlbums, getAlbumCount } from "../../lib/subsonic.js";
    import SectionWrapper from "../../lib/components/SectionWrapper.svelte";

    /** @type {any[]} */
    let albums = $state([]);
    let loading = $state(true);
    let totalAlbums = $state(0);
    const limit = 50;
    const baseUrl = "/albums";

    let currentPage = $derived(Number($page.url.searchParams.get("page")) || 1);
    let offset = $derived((currentPage - 1) * limit);

    async function loadAlbums() {
        loading = true;
        try {
            const [albumsData, countData] = await Promise.all([
                getAlbums(offset, limit),
                totalAlbums === 0
                    ? getAlbumCount()
                    : Promise.resolve(totalAlbums),
            ]);

            if (
                albumsData &&
                albumsData.albumList &&
                albumsData.albumList.album
            ) {
                albums = albumsData.albumList.album;
            } else {
                albums = [];
            }

            if (countData && typeof countData === "number") {
                totalAlbums = countData;
            }
        } catch (e) {
            console.error("Error loading albums:", e);
        } finally {
            loading = false;
        }
    }

    $effect(() => {
        if (currentPage) {
            loadAlbums();
        }
    });
</script>

<div class="container mx-auto pb-24 px-4">
    {#if loading}
        <div class="flex justify-center items-center h-64">
            <div
                class="animate-spin rounded-full h-8 w-8 border-b-2 border-white"
            ></div>
        </div>
    {:else}
        <SectionWrapper
            title="Albums"
            items={albums}
            type="album"
            totalItems={totalAlbums}
            {currentPage}
            {limit}
            {baseUrl}
            enableViewToggle={true}
        />
    {/if}
</div>
