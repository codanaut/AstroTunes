<script>
    import AlbumList from "../AlbumList.svelte";
    import ArtistList from "../ArtistList.svelte";

    /** @type {any[]} */
    export let items = [];
    /** @type {'album' | 'artist'} */
    export let type = "album";
</script>

{#if type === "album"}
    <AlbumList albums={items} />
{:else if type === "artist"}
    <ArtistList artists={items} />
{/if}
