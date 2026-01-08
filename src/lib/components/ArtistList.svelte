<script>
    import { Heart } from "lucide-svelte";
    import { getCoverArtUrl } from "../subsonic.js";

    /** @type {any[]} */
    export let artists = [];

    /** @param {Event} e */
    function handleImageError(e) {
        const target = /** @type {HTMLImageElement} */ (e.target);
        if (target) {
            target.src = "/placeholder_artist.png";
        }
    }
</script>

<div
    class="overflow-x-auto rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)]/20"
>
    <table class="w-full text-left text-sm">
        <thead
            class="bg-[var(--bg-card)]/50 text-[var(--text-secondary)] uppercase font-medium"
        >
            <tr>
                <th class="px-4 py-3 w-16"></th>
                <!-- Avatar -->
                <th class="px-4 py-3">Artist</th>
                <th class="px-4 py-3 text-right">Albums</th>
                <th class="px-4 py-3 w-10"></th>
                <!-- Star -->
            </tr>
        </thead>
        <tbody class="divide-y divide-[var(--border-primary)]">
            {#each artists as artist}
                <tr class="hover:bg-[var(--bg-hover)] transition-colors group">
                    <td class="px-4 py-2">
                        <a
                            href="/artist/{artist.id}"
                            class="block h-10 w-10 rounded-full overflow-hidden bg-[var(--bg-card)]"
                        >
                            <img
                                src={getCoverArtUrl(artist.id, 100)}
                                alt=""
                                class="h-full w-full object-cover"
                                loading="lazy"
                                on:error={handleImageError}
                            />
                        </a>
                    </td>
                    <td class="px-4 py-2 font-medium">
                        <a
                            href="/artist/{artist.id}"
                            class="hover:text-[var(--accent)] hover:underline decoration-[var(--accent)]/50 block"
                        >
                            {artist.name}
                        </a>
                    </td>
                    <td
                        class="px-4 py-2 text-right text-[var(--text-secondary)]"
                    >
                        {artist.albumCount}
                    </td>
                    <td
                        class="px-4 py-2 text-center text-[var(--text-secondary)]"
                    >
                        <div
                            class="p-1.5 {artist.starred
                                ? 'opacity-100'
                                : 'opacity-0 group-hover:opacity-100'} transition-opacity"
                        >
                            <Heart
                                size={16}
                                class={artist.starred
                                    ? "text-red-500 fill-red-500"
                                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}
                            />
                        </div>
                    </td>
                </tr>
            {/each}
        </tbody>
    </table>
</div>
