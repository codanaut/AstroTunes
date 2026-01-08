<script>
    import { Heart } from "lucide-svelte";
    import { getCoverArtUrl, starAlbum, unstarAlbum } from "../subsonic.js";

    /** @type {any} */
    export let album;

    /**
     * @param {any} albumToToggle
     * @param {Event} event
     */
    async function toggleAlbumFavorite(albumToToggle, event) {
        event.preventDefault();
        event.stopPropagation();

        const wasStarred = !!album.starred;
        const originalStarredValue = album.starred;

        album = {
            ...album,
            starred: wasStarred ? undefined : new Date().toISOString(),
        };

        try {
            if (wasStarred) {
                await unstarAlbum(album.id);
            } else {
                await starAlbum(album.id);
            }
        } catch (error) {
            console.error("Failed to toggle album favorite:", error);
            album = { ...album, starred: originalStarredValue };
        }
    }
</script>

<div class="text-left group block relative my-4">
    <!-- Album Cover Link -->
    <a href="/album/{album.id}">
        <div
            class="relative aspect-square mb-2 overflow-hidden rounded-lg bg-[var(--bg-card)]"
        >
            <img
                src={getCoverArtUrl(album.id)}
                alt={album.title}
                class="object-cover w-full h-full transform group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
            />
            <!-- Favorite Button -->
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
                onclick={(e) => toggleAlbumFavorite(album, e)}
                class="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 hover:bg-black/70 transition-colors opacity-0 group-hover:opacity-100 {album.starred
                    ? 'opacity-100'
                    : ''}"
            >
                <Heart
                    size={18}
                    class={album.starred
                        ? "text-red-500 fill-red-500"
                        : "text-[var(--text-primary)]"}
                />
            </div>
        </div>
        <!-- Album Title -->
        <div
            class="font-medium truncate text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors"
        >
            {album.title || album.name}
        </div>
    </a>
    <!-- Artist Link -->
    {#if album.artist}
        <div
            class="text-sm text-[var(--text-secondary)] truncate hover:text-[var(--accent)] transition-colors hover:underline"
        >
            <a href="/artist/{album.artistId}">{album.artist}</a>
        </div>
    {/if}
</div>
