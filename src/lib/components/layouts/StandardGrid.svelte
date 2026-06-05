<script>
    import AlbumCard from "../AlbumCard.svelte";
    import ArtistCard from "../ArtistCard.svelte";
    import { isMobileDevice } from "$lib/utils/deviceUtils";

    let { items = [], type = "album" } = $props();

    let displayItems = $derived(isMobileDevice() ? items.slice(0, 4) : items);
    let activeMenuAlbumId = $state(null);
</script>

<div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-8">
    {#if type === "album"}
        {#each displayItems as item (item.id)}
            <AlbumCard
                album={item}
                isOpen={activeMenuAlbumId === item.id}
                onToggle={(/** @type {boolean} */ open) => {
                    activeMenuAlbumId = open ? item.id : null;
                }}
            />
        {/each}
    {:else if type === "artist"}
        {#each displayItems as item (item.id)}
            <ArtistCard artist={item} />
        {/each}
    {/if}
</div>
