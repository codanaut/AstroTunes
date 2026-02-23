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

    let { album } = $props();

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
    <a href={resolve(`/album/${album.id}`)} class="block no-underline">
        <div
            class="relative aspect-square mb-3 overflow-hidden rounded-xl bg-[var(--bg-card)] shadow-lg transition-all duration-300 group-hover:shadow-[var(--theme-glow)]"
        >
            <img
                src={getCoverArtUrl(album.id)}
                alt={album.title}
                class="object-cover w-full h-full transform group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
            />

            <!-- Dark Gradient Overlay (Hover) -->
            <div
                class="absolute inset-0 bg-black/40 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-auto lg:pointer-events-none lg:group-hover:pointer-events-auto"
            >
                <!-- Centered Play Button -->
                <button
                    onclick={(e) => playAlbum(e)}
                    class="p-4 rounded-full bg-[var(--accent)] text-[var(--accent-fg)] shadow-2xl scale-90 lg:group-hover:scale-100 transition-all duration-300 hover:scale-110"
                    title="Play"
                >
                    <Play size={28} fill="currentColor" class="ml-1" />
                </button>
            </div>

            <!-- Favorite Button (Top Right) -->
            <button
                onclick={(e) => toggleAlbumFavorite(album, e)}
                class="absolute top-3 right-3 p-2 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition-all opacity-100 lg:opacity-0 lg:group-hover:opacity-100 {album.starred
                    ? 'opacity-100 !bg-[var(--accent)]/20 text-[var(--accent)]'
                    : ''} cursor-pointer border-none z-20 pointer-events-auto lg:pointer-events-none lg:group-hover:pointer-events-auto"
                aria-label={album.starred
                    ? "Unfavorite album"
                    : "Favorite album"}
            >
                <Heart
                    size={20}
                    class={album.starred ? "fill-[var(--accent)]" : ""}
                />
            </button>

            <!-- Shuffle Button (Bottom Right) -->
            <button
                onclick={(e) => shuffleAlbum(e)}
                class="absolute bottom-3 right-3 p-2 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition-all opacity-100 lg:opacity-0 lg:group-hover:opacity-100 cursor-pointer border-none z-20 pointer-events-auto lg:pointer-events-none lg:group-hover:pointer-events-auto"
                title="Shuffle"
            >
                <Shuffle size={18} />
            </button>
        </div>

        <!-- Album Title -->
        <div
            class="font-bold truncate text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors text-base"
        >
            {album.title || album.name}
        </div>
    </a>

    <!-- Artist Link -->
    {#if album.artist}
        <div
            class="text-sm text-[var(--text-muted)] truncate hover:text-[var(--text-primary)] transition-colors"
        >
            <a href={resolve(`/artist/${album.artistId}`)}>{album.artist}</a>
        </div>
    {/if}
</div>
