<script>
    import { onMount } from "svelte";
    import { getSimilarArtists } from "../subsonic.js";
    import ArtistCard from "./ArtistCard.svelte";

    let { artistId } = $props();

    /** @type {any[]} */
    let similarArtists = $state([]);
    let loading = $state(false);
    /** @type {string | null} */
    let loadedArtistId = $state(null);
    /** @type {HTMLElement} */
    let element;
    let intersecting = $state(false);

    $effect(() => {
        if (artistId && intersecting && artistId !== loadedArtistId) {
            loadSimilarArtists();
        }
    });

    onMount(() => {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                intersecting = true;
            }
        });

        if (element) {
            observer.observe(element);
        }

        return () => {
            observer.disconnect();
        };
    });

    async function loadSimilarArtists() {
        loading = true;
        loadedArtistId = artistId; // Prevent multiple fetches
        similarArtists = [];
        try {
            const artists = await getSimilarArtists(artistId, 5);
            if (artists) {
                // Ensure we have an array
                similarArtists = Array.isArray(artists) ? artists : [artists];
            }
        } catch (error) {
            console.error("Failed to load similar artists:", error);
        } finally {
            loading = false;
        }
    }
</script>

<div bind:this={element} class="min-h-[50px]">
    {#if !loading && similarArtists.length > 0}
        <div class="container mx-auto">
            <h1 class="text-2xl font-bold mt-6 mb-6">Similar Artists</h1>
            <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {#each similarArtists as artist (artist.id)}
                    <ArtistCard {artist} />
                {/each}
            </div>
        </div>
    {/if}
</div>
