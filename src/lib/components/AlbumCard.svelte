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

    let { album, className = "", isOpen = false, onToggle } = $props();

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
     * @param {Event} event
     */
    async function toggleAlbumFavorite(event) {
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

<div class="text-left group flex flex-col relative h-full {className}">
    <!-- Main Full-Card Link for Touch Targets -->
    <a
        href={resolve(`/album/${album.id}`)}
        class="absolute inset-0 z-10 no-underline rounded-xl"
        aria-label={album.title || album.name}
    ></a>

    <!-- Album Cover Link -->
    <div
        class="relative aspect-square mb-2 overflow-hidden rounded-xl bg-[var(--bg-card)] shadow-lg transition-all duration-300 group-hover:shadow-[var(--theme-glow)] shrink-0"
    >
        <div class="block w-full h-full pointer-events-none">
            <img
                src={getCoverArtUrl(album.id)}
                alt={album.title}
                class="object-cover w-full h-full transform group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
            />
        </div>

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
            onclick={(e) => toggleAlbumFavorite(e)}
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
                {isOpen}
                {onToggle}
            />
        </div>
    </div>

    <!-- Text Area -->
    <div class="flex flex-col relative z-20 pointer-events-none flex-grow">
        <!-- Album Title -->
        <div
            class="font-bold text-[var(--text-primary)] text-sm md:text-base leading-tight line-clamp-2 group-hover:text-[var(--accent)] transition-colors mb-0.5"
        >
            {album.title || album.name}
        </div>

        <!-- Artist Link -->
        {#if album.artist}
            <a
                href={resolve(`/artist/${album.artistId}`)}
                class="text-sm text-[var(--text-muted)] truncate hover:text-[var(--text-primary)] transition-colors pointer-events-auto w-fit max-w-full block no-underline mb-1"
            >
                {album.artist}
            </a>
        {/if}

        <!-- Metadata Row (Year, Tracks, Runtime) -->
        <div
            class="text-[11px] text-[var(--text-muted)] truncate w-full flex items-center"
        >
            <span class="truncate flex-grow">
                {#if album.year}{album.year}{/if}
                {#if album.year && (album.songCount || album.duration)}<span
                        class="opacity-50 mx-1">•</span
                    >{/if}
                {#if album.songCount}{album.songCount} Tracks{/if}
                {#if album.songCount && album.duration}<span
                        class="opacity-50 mx-1">•</span
                    >{/if}
                {#if album.duration}{Math.max(
                        1,
                        Math.round(album.duration / 60),
                    )} mins{/if}
            </span>
            <!-- Desktop Quality Tag Slot -->
            <div class="ml-2 pointer-events-auto shrink-0 empty:hidden">
                <!-- e.g. <span class="px-1 py-0.5 rounded bg-[var(--bg-hover)] text-[9px] font-bold">HD</span> -->
            </div>
        </div>
    </div>
</div>
