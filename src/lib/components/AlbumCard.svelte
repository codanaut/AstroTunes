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
    import OptionsButton from "./OptionsButton.svelte";

    let { album, className = "" } = $props();

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

<div class="text-left group block relative {className}">
    <!-- Album Cover Link -->
    <div
        class="relative aspect-square mb-3 overflow-hidden rounded-xl bg-[var(--bg-card)] shadow-lg transition-all duration-300 group-hover:shadow-[var(--theme-glow)]"
    >
        <a
            href={resolve(`/album/${album.id}`)}
            class="block w-full h-full no-underline"
        >
            <img
                src={getCoverArtUrl(album.id)}
                alt={album.title}
                class="object-cover w-full h-full transform group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
            />
        </a>

        <!-- Play Button (Top Left) -->
        <button
            onclick={(e) => playAlbum(e)}
            class="absolute top-3 left-3 p-2 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-[var(--accent)] hover:text-[var(--accent-fg)] transition-all opacity-100 lg:opacity-0 lg:group-hover:opacity-100 cursor-pointer border-none z-20 pointer-events-auto lg:pointer-events-none lg:group-hover:pointer-events-auto"
            title="Play"
        >
            <Play size={18} fill="currentColor" />
        </button>

        <!-- Favorite Button (Top Right) -->
        <button
            onclick={(e) => toggleAlbumFavorite(album, e)}
            class="absolute top-3 right-3 p-2 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition-all opacity-100 lg:opacity-0 lg:group-hover:opacity-100 {album.starred
                ? 'opacity-100 !bg-[var(--accent)]/20 text-[var(--accent)]'
                : ''} cursor-pointer border-none z-20 pointer-events-auto lg:pointer-events-none lg:group-hover:pointer-events-auto"
            aria-label={album.starred ? "Unfavorite album" : "Favorite album"}
        >
            <Heart
                size={18}
                class={album.starred ? "fill-[var(--accent)]" : ""}
            />
        </button>

        <!-- Shuffle Button (Bottom Left) -->
        <button
            onclick={(e) => shuffleAlbum(e)}
            class="absolute bottom-3 left-3 p-2 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition-all opacity-100 lg:opacity-0 lg:group-hover:opacity-100 cursor-pointer border-none z-20 pointer-events-auto lg:pointer-events-none lg:group-hover:pointer-events-auto"
            title="Shuffle"
        >
            <Shuffle size={18} />
        </button>

        <!-- Options Button (Bottom Right) -->
        <div
            class="absolute bottom-3 right-3 z-20 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all pointer-events-auto lg:pointer-events-none lg:group-hover:pointer-events-auto"
        >
            <OptionsButton
                item={album}
                itemType="album"
                className="p-2 bg-black/40 backdrop-blur-md text-white hover:bg-black/60"
            />
        </div>
    </div>

    <!-- Album Title -->
    <a
        href={resolve(`/album/${album.id}`)}
        class="block font-bold truncate text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors text-base no-underline"
    >
        {album.title || album.name}
    </a>

    <!-- Artist Link -->
    {#if album.artist}
        <div
            class="text-sm text-[var(--text-muted)] truncate hover:text-[var(--text-primary)] transition-colors"
        >
            <a href={resolve(`/artist/${album.artistId}`)} class="no-underline"
                >{album.artist}</a
            >
        </div>
    {/if}
</div>
