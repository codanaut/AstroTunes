<script>
    import AlbumCard from "../AlbumCard.svelte";
    import ArtistCard from "../ArtistCard.svelte";

    /** @type {any[]} */
    export let items = [];
    /** @type {'album' | 'artist'} */
    export let type = "album";
</script>

<div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
    {#if type === "album"}
        {#each items as item (item.id)}
            <AlbumCard album={item} />
        {/each}
    {:else if type === "artist"}
        {#each items as item (item.id)}
            <ArtistCard artist={item} />
        {/each}
    {/if}
</div>
