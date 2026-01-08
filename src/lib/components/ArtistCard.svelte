<script>
    import { Heart } from "lucide-svelte";
    import { getCoverArtUrl } from "../subsonic.js";

    /** @type {any} */
    export let artist;

    /** @param {Event} e */
    function handleImageError(e) {
        const target = /** @type {HTMLImageElement} */ (e.target);
        if (target) {
            target.src = "/placeholder_artist.png";
        }
    }
</script>

<a href="/artist/{artist.id}" class="text-left group block my-4">
    <div
        class="relative aspect-square mb-2 overflow-hidden rounded-lg bg-[var(--bg-card)]"
    >
        <img
            src={getCoverArtUrl(artist.id)}
            alt={artist.name}
            class="object-cover w-full h-full transform group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            on:error={handleImageError}
        />

        <div class="absolute top-2 right-2 p-1 bg-black/50 rounded-full">
            <Heart
                size={18}
                class={artist.starred
                    ? "text-red-500 fill-red-500"
                    : "text-[var(--text-primary)]"}
            />
        </div>
    </div>
    <div
        class="font-medium truncate text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors"
    >
        {artist.name}
    </div>
</a>
