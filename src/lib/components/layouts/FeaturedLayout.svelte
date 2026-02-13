<script>
    import AlbumCard from "../AlbumCard.svelte";
    import ArtistCard from "../ArtistCard.svelte";

    /** @type {any[]} */
    export let items = [];
    /** @type {'album' | 'artist'} */
    export let type = "album";
</script>

<div class="flex flex-wrap justify-center gap-6">
    {#if type === "album"}
        {#each items.slice(0, 3) as item (item.id)}
            <div class="w-40 md:w-56 lg:w-64">
                <AlbumCard album={item} className="h-full" />
            </div>
        {/each}
    {:else if type === "artist"}
        {#each items.slice(0, 3) as item (item.id)}
            <div class="w-40 md:w-56 lg:w-64">
                <ArtistCard artist={item} />
            </div>
        {/each}
    {/if}
</div>
