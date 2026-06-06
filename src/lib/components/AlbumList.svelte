<script>
    import {
        Heart,
        Clock,
        Music,
        Calendar,
        ArrowUp,
        ArrowDown,
    } from "lucide-svelte";
    import { getCoverArtUrl, starAlbum, unstarAlbum } from "../subsonic.js";
    import { resolve } from "$app/paths";
    import { isMobileDevice } from "$lib/utils/deviceUtils.js";

    let { albums = $bindable([]) } = $props();

    // --- DEVICE DETECTORS MAP TO SONGLIST ---
    let isDesktop = $state(!isMobileDevice());
    let containerWidth = $state(1024);
    let isMobile = $derived(containerWidth < 768);

    // --- SORTING STATE ---
    let sortField = $state("original");
    let sortDirection = $state("asc");

    // Unified Columns Configuration
    const ALL_COLUMNS = [
        { id: "cover", label: "", alwaysVisible: true, sortable: false },
        { id: "title", label: "Album", alwaysVisible: true, sortable: true },
        { id: "artist", label: "Artist", alwaysVisible: false, sortable: true },
        {
            id: "songCount",
            label: "Tracks",
            icon: Music,
            alwaysVisible: false,
            sortable: true,
        },
        {
            id: "year",
            label: "Year",
            icon: Calendar,
            alwaysVisible: false,
            sortable: true,
        },
        {
            id: "starred",
            label: "",
            icon: Heart,
            alwaysVisible: true,
            sortable: true,
        },
        {
            id: "duration",
            label: "Duration",
            icon: Clock,
            alwaysVisible: true,
            sortable: true,
        },
    ];

    /**
     * @param {string} id
     */
    function isColumnVisible(id) {
        if (
            id === "cover" ||
            id === "title" ||
            id === "starred" ||
            id === "duration"
        ) {
            return true;
        }
        if (isMobile) return false;
        return true;
    }

    // Array Builder avoids token breakdown or comment corruption in CSS custom variables
    let desktopGridColumns = $derived(
        [
            "40px",
            isMobile ? "minmax(0, 1fr)" : "minmax(200px, 3fr)",
            isColumnVisible("artist") ? "minmax(150px, 2fr)" : "",
            isColumnVisible("songCount") ? "70px" : "",
            isColumnVisible("year") ? "60px" : "",
            isColumnVisible("starred") ? "2rem" : "",
            isColumnVisible("duration") ? "auto" : "",
        ]
            .filter(Boolean)
            .join(" "),
    );

    // Sorting Logic
    /**
     * @param {string} field
     */
    function handleSort(field) {
        if (!ALL_COLUMNS.find((c) => c.id === field)?.sortable) return;
        if (sortField === field) {
            if (sortDirection === "asc") sortDirection = "desc";
            else {
                sortField = "original";
                sortDirection = "asc";
            }
        } else {
            sortField = field;
            sortDirection = "asc";
        }
    }

    let processedAlbums = $derived(
        (() => {
            let result = [...albums];
            if (sortField !== "original") {
                result.sort((a, b) => {
                    let valA = a[sortField];
                    let valB = b[sortField];

                    if (sortField === "starred") valA = a.starred ? 1 : 0;
                    if (sortField === "starred") valB = b.starred ? 1 : 0;

                    if (sortField === "title") valA = a.title || a.name;
                    if (sortField === "title") valB = b.title || b.name;

                    if (typeof valA === "string") valA = valA.toLowerCase();
                    if (typeof valB === "string") valB = valB.toLowerCase();

                    if (valA < valB) return sortDirection === "asc" ? -1 : 1;
                    if (valA > valB) return sortDirection === "asc" ? 1 : -1;
                    return 0;
                });
            }
            return result;
        })(),
    );

    /**
     * @param {any} album
     * @param {Event} event
     */
    async function toggleAlbumFavorite(album, event) {
        event.preventDefault();
        event.stopPropagation();

        const originalStarred = album.starred;
        const isStarred = !!album.starred;

        const index = albums.findIndex((a) => a.id === album.id);
        if (index !== -1) {
            albums[index] = {
                ...album,
                starred: isStarred ? undefined : new Date().toISOString(),
            };
        }

        try {
            if (isStarred) {
                await unstarAlbum(album.id);
            } else {
                await starAlbum(album.id);
            }
        } catch (error) {
            console.error("Failed to toggle album favorite:", error);
            if (index !== -1) {
                albums[index] = { ...album, starred: originalStarred };
            }
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
    bind:clientWidth={containerWidth}
    class="w-full flex flex-col relative backdrop-blur-xl shadow-xl bg-[var(--bg-sidebar)]/80 rounded-xl overflow-x-auto border border-[var(--border-primary)]"
>
    {#if isDesktop}
        <div
            class="album-grid gap-4 px-4 py-3 text-xs text-[var(--text-secondary)] border-b border-[var(--border-primary)] uppercase tracking-wider items-center font-semibold bg-[var(--bg-card)]/50 select-none"
            style="--desktop-cols: {desktopGridColumns};"
        >
            {#each ALL_COLUMNS as col}
                {#if isColumnVisible(col.id)}
                    <div
                        class="flex items-center gap-1
                        {col.id === 'duration' ||
                        col.id === 'songCount' ||
                        col.id === 'year'
                            ? 'justify-end'
                            : ''} 
                        {col.id === 'starred' ? 'justify-center' : ''} 
                        {col.sortable
                            ? 'cursor-pointer hover:text-[var(--text-primary)] transition-colors'
                            : ''}"
                        onclick={() => handleSort(col.id)}
                        role="button"
                        tabindex="0"
                        onkeydown={(e) =>
                            (e.key === "Enter" || e.key === " ") &&
                            handleSort(col.id)}
                    >
                        {#if col.icon}
                            {@const Icon = col.icon}
                            <Icon size={14} />
                        {:else}
                            {col.label}
                        {/if}

                        {#if sortField === col.id}
                            {#if sortDirection === "asc"}
                                <ArrowUp
                                    size={12}
                                    class="text-[var(--accent)]"
                                />
                            {:else}
                                <ArrowDown
                                    size={12}
                                    class="text-[var(--accent)]"
                                />
                            {/if}
                        {/if}
                    </div>
                {/if}
            {/each}
        </div>
    {/if}

    <div class="flex flex-col">
        {#each processedAlbums as album (album.id)}
            <a
                href={resolve(`/album/${album.id}`)}
                class="album-grid gap-4 px-4 py-2.5 text-sm items-center hover:bg-[var(--bg-hover)] group transition-colors border-b border-[var(--border-secondary)]/50 last:border-0 text-[var(--text-secondary)]"
                style="--desktop-cols: {desktopGridColumns};"
            >
                <div
                    class="w-10 h-10 rounded overflow-hidden bg-[var(--bg-card)] shrink-0 shadow-sm"
                >
                    <img
                        src={getCoverArtUrl(album.id, 100)}
                        alt=""
                        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                    />
                </div>

                <div
                    class="font-medium text-base text-[var(--text-primary)] truncate"
                >
                    <span
                        class="group-hover:text-[var(--accent)] transition-colors"
                        >{album.title}</span
                    >
                    {#if isMobile}
                        <div
                            class="text-xs text-[var(--text-muted)] truncate mt-0.5 font-normal"
                        >
                            {album.artist}
                        </div>
                    {/if}
                </div>

                {#if isColumnVisible("artist")}
                    <div
                        class="truncate hover:text-[var(--text-primary)] transition-colors"
                    >
                        {album.artist}
                    </div>
                {/if}

                {#if isColumnVisible("songCount")}
                    <div class="text-right tabular-nums">
                        {album.songCount || "-"}
                    </div>
                {/if}

                {#if isColumnVisible("year")}
                    <div class="text-right tabular-nums">
                        {album.year || "-"}
                    </div>
                {/if}

                {#if isColumnVisible("starred")}
                    <div class="flex justify-center z-10">
                        <button
                            onclick={(e) => toggleAlbumFavorite(album, e)}
                            class="p-1.5 rounded-full hover:bg-[var(--text-primary)]/10 transition-all {album.starred
                                ? 'opacity-100'
                                : 'opacity-0 group-hover:opacity-100'}"
                            aria-label="Toggle favorite"
                        >
                            <Heart
                                size={16}
                                class={album.starred
                                    ? "text-red-500 fill-red-500"
                                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}
                            />
                        </button>
                    </div>
                {/if}

                {#if isColumnVisible("duration")}
                    <div class="text-right tabular-nums">
                        {formatDuration(album.duration)}
                    </div>
                {/if}
            </a>
        {/each}
    </div>
</div>

<style>
    .album-grid {
        display: grid;
        grid-template-columns: var(--desktop-cols);
        gap: 0.5rem;
        align-items: center;
    }

    @media (min-width: 768px) {
        .album-grid {
            gap: 1rem;
        }
    }
</style>
