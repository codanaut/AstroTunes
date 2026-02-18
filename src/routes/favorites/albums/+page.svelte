<script>
    import { page } from "$app/stores";
    import {
        subsonicFetch,
        getCoverArtUrl,
        starAlbum,
        unstarAlbum,
    } from "../../../lib/subsonic.js";
    import BackButton from "../../../lib/components/BackButton.svelte";
    import SectionWrapper from "../../../lib/components/SectionWrapper.svelte";
    import { onMount } from "svelte";

    /** @type {any[]} */
    let allFavorites = $state([]);
    /** @type {any[]} */
    let displayedAlbums = $state([]);
    let loading = $state(true);
    const limit = 50;
    const baseUrl = "/favorites/albums";

    let currentPage = $derived(Number($page.url.searchParams.get("page")) || 1);

    // Client-side slice for display
    $effect(() => {
        const start = (currentPage - 1) * limit;
        const end = start + limit;
        displayedAlbums = allFavorites.slice(start, end);
    });

    onMount(async () => {
        await loadFavorites();
    });

    async function loadFavorites() {
        loading = true;
        try {
            // Fetch ALL favorites to get correct count and data
            const starred = await subsonicFetch("getStarred");
            if (starred && starred.starred && starred.starred.album) {
                allFavorites = starred.starred.album;
            } else {
                allFavorites = [];
            }
        } catch (e) {
            console.error("Error loading favorites:", e);
        } finally {
            loading = false;
        }
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
            title="Favorite Albums"
            items={displayedAlbums}
            type="album"
            {currentPage}
            {limit}
            {baseUrl}
            enableViewToggle={true}
            totalItems={allFavorites.length}
        />
    {/if}
</div>
