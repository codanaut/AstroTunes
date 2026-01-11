<script>
    import { page } from "$app/stores";
    import { getAlbums } from "../../../lib/subsonic.js";
    import BackButton from "../../../lib/components/BackButton.svelte";
    import SectionWrapper from "../../../lib/components/SectionWrapper.svelte";

    /** @type {any[]} */
    let albums = [];
    let loading = true;
    const limit = 50;
    const baseUrl = "/albums/top";

    $: currentPage = Number($page.url.searchParams.get("page")) || 1;
    $: offset = (currentPage - 1) * limit;

    async function loadAlbums() {
        loading = true;
        try {
            const albumsData = await getAlbums(offset, limit, "frequent");

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
            loading = false;
        }
    }

    $: if (currentPage) {
        loadAlbums();
    }
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
            title="Top Played Albums"
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
