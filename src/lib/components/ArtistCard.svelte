<script>
    import { Heart } from "lucide-svelte";
    import { getCoverArtUrl, subsonicFetch } from "../subsonic.js";
    import { resolve } from "$app/paths";

    let { artist = $bindable() } = $props();

    /** @param {Event} e */
    function handleImageError(e) {
        const target = /** @type {HTMLImageElement} */ (e.target);
        if (target) {
            target.src = "/placeholder_artist.png";
        }
    }

    /**
     * @param {any} artistToToggle
     * @param {Event} event
     */
    async function toggleArtistFavorite(artistToToggle, event) {
        // Prevent default just in case, though structure handles it now
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

<div class="text-left group block my-4 relative">
    <div class="relative aspect-square mb-2">
        <!-- Main Link -->
        <a
            href={resolve(`/artist/${artist.id}`)}
            class="block w-full h-full overflow-hidden rounded-lg bg-[var(--bg-card)]"
        >
            <img
                src={getCoverArtUrl(artist.id)}
                alt={artist.name}
                class="object-cover w-full h-full transform group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
                onerror={handleImageError}
            />
        </a>

        <!-- Favorite Button (Outside Anchor) -->
        <button
            onclick={(e) => toggleArtistFavorite(artist, e)}
            class="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 hover:bg-black/70 transition-colors opacity-0 group-hover:opacity-100 {artist.starred
                ? 'opacity-100'
                : ''} cursor-pointer border-none z-10"
            aria-label={artist.starred
                ? "Unfavorite artist"
                : "Favorite artist"}
        >
            <Heart
                size={18}
                class={artist.starred
                    ? "text-red-500 fill-red-500"
                    : "text-[var(--text-primary)]"}
            />
        </button>
    </div>

    <!-- Name Link -->
    <a
        href={resolve(`/artist/${artist.id}`)}
        class="block font-medium truncate text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors"
    >
        {artist.name}
    </a>
</div>
