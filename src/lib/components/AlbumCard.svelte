<script>
    import { Heart, Play, Shuffle } from "lucide-svelte";
    import {
        getCoverArtUrl,
        starAlbum,
        unstarAlbum,
        subsonicFetch,
    } from "../subsonic.js";
    import { playQueue, playQueueShuffled } from "../player.js";
    import { resolve } from "$app/paths";

    /** @type {any} */
    export let album;
    export let className = "";

    /**
     * @param {Event} event
     */
    async function playAlbum(event) {
        event.preventDefault();
        event.stopPropagation();

        try {
            // We need to fetch the full album to get the songs
            const data = await subsonicFetch("getAlbum", `&id=${album.id}`);
            if (data && data.album && data.album.song) {
                const songs = Array.isArray(data.album.song)
                    ? data.album.song
                    : [data.album.song];
                playQueue(songs, 0, {
                    type: "album",
                    id: album.id,
                    name: album.title || album.name,
                });
            }
        } catch (error) {
            console.error("Failed to play album:", error);
        }
    }

    /**
     * @param {Event} event
     */
    async function shuffleAlbum(event) {
        event.preventDefault();
        event.stopPropagation();

        try {
            const data = await subsonicFetch("getAlbum", `&id=${album.id}`);
            if (data && data.album && data.album.song) {
                const songs = Array.isArray(data.album.song)
                    ? data.album.song
                    : [data.album.song];
                playQueueShuffled(songs);
            }
        } catch (error) {
            console.error("Failed to shuffle album:", error);
        }
    }

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
    <a href={resolve(`/album/${album.id}`)}>
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
            <button
                onclick={(e) => toggleAlbumFavorite(album, e)}
                class="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 hover:bg-black/70 transition-colors opacity-0 group-hover:opacity-100 {album.starred
                    ? 'opacity-100'
                    : ''} cursor-pointer border-none"
                aria-label={album.starred
                    ? "Unfavorite album"
                    : "Favorite album"}
            >
                <Heart
                    size={18}
                    class={album.starred
                        ? "text-red-500 fill-red-500"
                        : "text-[var(--text-primary)]"}
                />
            </button>

            <!-- Play Actions -->
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
                class="absolute bottom-2 right-2 left-2 flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                onclick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                }}
            >
                <button
                    onclick={(e) => playAlbum(e)}
                    class="p-2 rounded-full bg-[var(--accent)] text-[var(--accent-fg)] shadow-lg hover:scale-110 transition-transform"
                    title="Play"
                >
                    <Play size={20} fill="currentColor" class="ml-0.5" />
                </button>
                <button
                    onclick={(e) => shuffleAlbum(e)}
                    class="p-2 rounded-full bg-[var(--bg-card)] text-[var(--text-primary)] shadow-lg hover:bg-[var(--bg-hover)] transition-colors"
                    title="Shuffle"
                >
                    <Shuffle size={20} />
                </button>
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
            <a href={resolve(`/artist/${album.artistId}`)}>{album.artist}</a>
        </div>
    {/if}
</div>
