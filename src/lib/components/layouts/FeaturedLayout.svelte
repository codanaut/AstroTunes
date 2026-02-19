<script>
    import AlbumCard from "../AlbumCard.svelte";
    import ArtistCard from "../ArtistCard.svelte";

    let { items = [], type = "album" } = $props();
</script>

<div class="grid grid-cols-2 md:grid-cols-4 gap-6 justify-items-center">
    {#if type === "album"}
        {#each items.slice(0, 4) as item (item.id)}
            <div class="w-full max-w-[256px]">
                <AlbumCard album={item} className="h-full" />
            </div>
        {/each}
    {:else if type === "artist"}
        {#each items.slice(0, 4) as item (item.id)}
            <div class="w-full max-w-[256px]">
                <ArtistCard artist={item} />
            </div>
        {/each}
    {/if}
</div>
