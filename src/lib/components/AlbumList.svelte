<script>
    import { Heart } from "lucide-svelte";
    import { getCoverArtUrl, starAlbum, unstarAlbum } from "../subsonic.js";
    import { resolve } from "$app/paths";

    let { albums = [] } = $props();

    /**
     * @param {any} album
     * @param {Event} event
     */
    async function toggleAlbumFavorite(album, event) {
        event.preventDefault();
        event.stopPropagation();

        const isStarred = !!album.starred;

        try {
            if (isStarred) {
                await unstarAlbum(album.id);
                album.starred = undefined;
            } else {
                await starAlbum(album.id);
                album.starred = new Date().toISOString();
            }
            // Force reactivity
            albums = albums;
        } catch (error) {
            console.error("Failed to toggle album favorite:", error);
        }
    }

    /**
     * @param {number} seconds
     */
    function formatDuration(seconds) {
        if (!seconds) return "-";
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, "0")}`;
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
                <!-- Cover -->
                <th class="px-4 py-3">Album</th>
                <th class="px-4 py-3 hidden md:table-cell">Artist</th>
                <th class="px-4 py-3 text-right hidden sm:table-cell">Tracks</th
                >
                <th class="px-4 py-3 text-right hidden lg:table-cell">Year</th>
                <th class="px-4 py-3 text-right hidden lg:table-cell"
                    >Duration</th
                >
                <th class="px-4 py-3 w-10"></th>
                <!-- Heart -->
            </tr>
        </thead>
        <tbody class="divide-y divide-[var(--border-primary)]">
            {#each albums as album}
                <tr class="hover:bg-[var(--bg-hover)] transition-colors group">
                    <td class="px-4 py-2">
                        <a
                            href={resolve(`/album/${album.id}`)}
                            class="block h-10 w-10 rounded overflow-hidden bg-[var(--bg-card)]"
                        >
                            <img
                                src={getCoverArtUrl(album.id, 100)}
                                alt=""
                                class="h-full w-full object-cover"
                                loading="lazy"
                            />
                        </a>
                    </td>
                    <td class="px-4 py-2 font-medium">
                        <a
                            href={resolve(`/album/${album.id}`)}
                            class="hover:text-[var(--accent)] hover:underline decoration-[var(--accent)]/50 block"
                        >
                            {album.title}
                        </a>
                        <div
                            class="md:hidden text-xs text-[var(--text-muted)] mt-0.5"
                        >
                            {album.artist}
                        </div>
                    </td>
                    <td
                        class="px-4 py-2 hidden md:table-cell text-[var(--text-secondary)]"
                    >
                        <a
                            href={resolve(`/artist/${album.artistId}`)}
                            class="hover:text-[var(--text-primary)]"
                        >
                            {album.artist}
                        </a>
                    </td>
                    <td
                        class="px-4 py-2 text-right hidden sm:table-cell text-[var(--text-secondary)]"
                    >
                        {album.songCount || "-"}
                    </td>
                    <td
                        class="px-4 py-2 text-right hidden lg:table-cell text-[var(--text-secondary)]"
                    >
                        {album.year || "-"}
                    </td>
                    <td
                        class="px-4 py-2 text-right hidden lg:table-cell text-[var(--text-secondary)]"
                    >
                        {formatDuration(album.duration)}
                    </td>
                    <td
                        class="px-4 py-2 text-center text-[var(--text-secondary)]"
                    >
                        <button
                            onclick={(e) => toggleAlbumFavorite(album, e)}
                            class="p-1.5 rounded-full hover:bg-[var(--text-primary)]/10 transition-colors {album.starred
                                ? 'opacity-100'
                                : 'opacity-0 group-hover:opacity-100'}"
                        >
                            <Heart
                                size={16}
                                class={album.starred
                                    ? "text-red-500 fill-red-500"
                                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}
                            />
                        </button>
                    </td>
                </tr>
            {/each}
        </tbody>
    </table>
</div>
