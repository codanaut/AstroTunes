<script>
    import AlbumList from "../AlbumList.svelte";
    import ArtistList from "../ArtistList.svelte";

    let { items = [], type = "album" } = $props();
</script>

{#if type === "album"}
    <AlbumList albums={items} />
{:else if type === "artist"}
    <ArtistList artists={items} />
{/if}
