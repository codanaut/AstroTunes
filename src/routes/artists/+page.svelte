<script>
    import { onMount } from "svelte";
    import { page } from "$app/stores";
    import { getAllArtists } from "../../lib/subsonic.js";
    import SectionWrapper from "../../lib/components/SectionWrapper.svelte";

    /** @type {any[]} */
    let allArtists = $state([]);
    /** @type {any[]} */
    let displayedArtists = $state([]);
    let loading = $state(true);
    const limit = 50;
    const baseUrl = "/artists";

    let currentPage = $derived(Number($page.url.searchParams.get("page")) || 1);
    let offset = $derived((currentPage - 1) * limit);

    // When allArtists or currentPage changes, update displayedArtists
    $effect(() => {
        displayedArtists = allArtists.slice(offset, offset + limit);
    });

    onMount(async () => {
        await loadArtists();
    });

    async function loadArtists() {
        loading = true;
        try {
            const data = await getAllArtists();
            if (data && data.artists && data.artists.index) {
                allArtists = data.artists.index
                    .flatMap(
                        (/** @type {any} */ letterGroup) =>
                            letterGroup.artist || [],
                    )
                    .filter(
                        (/** @type {any} */ artist) => artist.albumCount > 0,
                    );
            } else {
                allArtists = [];
            }
        } catch (e) {
            console.error("Error loading artists:", e);
        } finally {
            loading = false;
        }
    }
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
            title={`Artists`}
            items={displayedArtists}
            type="artist"
            totalItems={allArtists.length}
            {currentPage}
            {limit}
            {baseUrl}
            enableViewToggle={true}
        />
    {/if}
</div>
