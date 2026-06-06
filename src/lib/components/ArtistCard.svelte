<script>
    import { Heart, Play } from "lucide-svelte";
    import { getCoverArtUrl, subsonicFetch } from "../subsonic.js";
    import { resolve } from "$app/paths";
    import { playQueue } from "../player.js";
    import OptionsButton from "./OptionsButton.svelte";

    let { artist = $bindable(), className = "" } = $props();

    /** @param {Event} e */
    function handleImageError(e) {
        const target = /** @type {HTMLImageElement} */ (e.target);
        if (target) {
            target.src = "/placeholder_artist.png";
        }
    }

    /**
     * @param {Event} event
     */
    async function playTopSongs(event) {
        event.preventDefault();
        event.stopPropagation();

        try {
            const data = await subsonicFetch(
                "getTopSongs",
                `&artist=${encodeURIComponent(artist.name)}&count=50`,
            );
            if (data?.topSongs?.song) {
                const songs = Array.isArray(data.topSongs.song)
                    ? data.topSongs.song
                    : [data.topSongs.song];
                playQueue(songs, 0, {
                    type: "artist",
                    id: artist.id,
                    name: artist.name,
                });
            }
        } catch (error) {
            console.error("Failed to play artist top songs:", error);
        }
    }

    /**
     * @param {Event} event
     */
    async function toggleArtistFavorite(event) {
        event.preventDefault();
        event.stopPropagation();

        const wasStarred = !!artist.starred;
        const originalStarredValue = artist.starred;

        // Optimistic update
        artist = {
            ...artist,
            starred: wasStarred ? undefined : new Date().toISOString(),
        };

        try {
            if (wasStarred) {
                await subsonicFetch("unstar", `&id=${artist.id}`);
            } else {
                await subsonicFetch("star", `&id=${artist.id}`);
            }
        } catch (error) {
            console.error("Failed to toggle artist favorite:", error);
            // Revert on error
            artist = { ...artist, starred: originalStarredValue };
        }
    }
</script>

<div class="text-center group block relative {className}">
    <div class="relative aspect-square mb-3 mx-auto max-w-[200px]">
        <!-- Main Link -->
        <a
            href={resolve(`/artist/${artist.id}`)}
            class="block w-full h-full overflow-hidden rounded-full bg-[var(--bg-card)] shadow-lg transition-all duration-300 group-hover:shadow-[var(--theme-glow)]"
        >
            <img
                src={getCoverArtUrl(artist.id)}
                alt={artist.name}
                class="object-cover w-full h-full transform group-hover:scale-110 transition-transform duration-500"
                loading="lazy"
                onerror={handleImageError}
            />
            <!-- Dark Overlay on Hover -->
            <div
                class="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full"
            ></div>
        </a>

        <!-- Play Button (Top Left of circle) -->
        <button
            onclick={(e) => playTopSongs(e)}
            class="absolute top-2 left-2 p-2 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-[var(--accent)] hover:text-[var(--accent-fg)] transition-all opacity-100 lg:opacity-0 lg:group-hover:opacity-100 cursor-pointer border-none z-10 pointer-events-auto lg:pointer-events-none lg:group-hover:pointer-events-auto"
            title="Play Top Songs"
        >
            <Play size={16} fill="currentColor" />
        </button>

        <!-- Favorite Button (Top Right of circle) -->
        <button
            onclick={(e) => toggleArtistFavorite(e)}
            class="absolute top-2 right-2 p-2 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition-all opacity-100 lg:opacity-0 lg:group-hover:opacity-100 {artist.starred
                ? 'opacity-100 !bg-[var(--accent)]/20 text-[var(--accent)]'
                : ''} cursor-pointer border-none z-10 pointer-events-auto lg:pointer-events-none lg:group-hover:pointer-events-auto"
            aria-label={artist.starred
                ? "Unfavorite artist"
                : "Favorite artist"}
        >
            <Heart
                size={16}
                class={artist.starred ? "fill-[var(--accent)]" : ""}
            />
        </button>

        <!-- Options Button (Bottom Right) -->
        <div
            class="absolute bottom-2 right-2 z-10 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all pointer-events-auto lg:pointer-events-none lg:group-hover:pointer-events-auto"
        >
            <OptionsButton
                item={artist}
                itemType="artist"
                className="p-2 bg-black/40 backdrop-blur-md text-white hover:bg-black/60"
            />
        </div>
    </div>

    <!-- Name Link -->
    <a
        href={resolve(`/artist/${artist.id}`)}
        class="block font-bold truncate text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors text-base no-underline"
    >
        {artist.name}
    </a>
    <div class="text-xs text-[var(--text-muted)] mt-1">Artist</div>
</div>
