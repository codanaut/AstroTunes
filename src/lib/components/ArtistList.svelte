<script>
    import { Heart, Disc, ArrowUp, ArrowDown } from "lucide-svelte";
    import { getCoverArtUrl, subsonicFetch } from "../subsonic.js";
    import { resolve } from "$app/paths";

    let { artists = $bindable([]) } = $props();

    // --- SORTING STATE ---
    let sortField = $state("original");
    let sortDirection = $state("asc");

    // Columns Configuration
    const ALL_COLUMNS = [
        { id: "cover", label: "", alwaysVisible: true, sortable: false },
        { id: "name", label: "Artist", alwaysVisible: true, sortable: true },
        {
            id: "albumCount",
            label: "Albums",
            icon: Disc,
            alwaysVisible: true,
            sortable: true,
        },
        {
            id: "starred",
            label: "",
            icon: Heart,
            alwaysVisible: true,
            sortable: true,
        },
    ];

    // Grid Template
    let desktopGridColumns = $derived(
        `
        40px /* Avatar */
        minmax(200px, 3fr) /* Name */
        100px /* Albums */
        40px /* Heart */
    `
            .replace(/\s+/g, " ")
            .trim(),
    );

    // Sorting Logic
    /** @param {string} field */
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

    let processedArtists = $derived(
        (() => {
            let result = [...artists];
            if (sortField !== "original") {
                result.sort((a, b) => {
                    let valA = a[sortField];
                    let valB = b[sortField];

                    if (sortField === "starred") valA = a.starred ? 1 : 0;
                    if (sortField === "starred") valB = b.starred ? 1 : 0;

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

    /** @param {Event} e */
    function handleImageError(e) {
        const target = /** @type {HTMLImageElement} */ (e.target);
        if (target) {
            target.src = "/placeholder_artist.png";
        }
    }

    /**
     * @param {any} artist
     * @param {Event} event
     */
    async function toggleArtistFavorite(artist, event) {
        event.preventDefault();
        event.stopPropagation();

        const originalStarred = artist.starred;
        const isStarred = !!artist.starred;

        // Update local state immediately
        const index = artists.findIndex((a) => a.id === artist.id);
        if (index !== -1) {
            artists[index] = {
                ...artist,
                starred: isStarred ? undefined : new Date().toISOString(),
            };
        }

        try {
            if (isStarred) {
                await subsonicFetch("unstar", `&id=${artist.id}`);
            } else {
                await subsonicFetch("star", `&id=${artist.id}`);
            }
        } catch (error) {
            console.error("Failed to toggle artist favorite:", error);
            if (index !== -1) {
                artists[index] = { ...artist, starred: originalStarred };
            }
        }
    }
</script>

<div
    class="w-full flex flex-col relative backdrop-blur-xl shadow-xl bg-[var(--bg-sidebar)]/80 rounded-xl overflow-x-auto border border-[var(--border-primary)]"
>
    <!-- Header -->
    <div
        class="grid gap-4 px-4 py-3 text-xs text-[var(--text-secondary)] border-b border-[var(--border-primary)] uppercase tracking-wider items-center font-semibold bg-[var(--bg-card)]/50 select-none"
        style="grid-template-columns: {desktopGridColumns};"
    >
        {#each ALL_COLUMNS as col}
            <div
                class="flex items-center gap-1 {col.id === 'albumCount'
                    ? 'justify-end'
                    : ''} {col.id === 'starred'
                    ? 'justify-center'
                    : ''} {col.sortable
                    ? 'cursor-pointer hover:text-[var(--text-primary)]'
                    : ''}"
                onclick={() => handleSort(col.id)}
                role="button"
                tabindex="0"
                onkeydown={(e) =>
                    (e.key === "Enter" || e.key === " ") && handleSort(col.id)}
            >
                {#if col.icon}
                    {@const Icon = col.icon}
                    <Icon size={14} />
                {:else}
                    {col.label}
                {/if}

                {#if sortField === col.id}
                    {#if sortDirection === "asc"}
                        <ArrowUp size={12} class="text-[var(--accent)]" />
                    {:else}
                        <ArrowDown size={12} class="text-[var(--accent)]" />
                    {/if}
                {/if}
            </div>
        {/each}
    </div>

    <!-- Rows -->
    <div class="flex flex-col">
        {#each processedArtists as artist (artist.id)}
            <a
                href={resolve(`/artist/${artist.id}`)}
                class="grid gap-4 px-4 py-2 text-sm items-center hover:bg-[var(--bg-hover)] group transition-colors border-b border-[var(--border-secondary)]/50 last:border-0 text-[var(--text-secondary)] rounded-lg mx-1"
                style="grid-template-columns: {desktopGridColumns};"
            >
                <!-- Avatar -->
                <div
                    class="w-10 h-10 rounded-full overflow-hidden bg-[var(--bg-card)] shrink-0"
                >
                    <img
                        src={getCoverArtUrl(artist.id, 100)}
                        alt=""
                        class="w-full h-full object-cover"
                        loading="lazy"
                        onerror={handleImageError}
                    />
                </div>

                <!-- Name -->
                <div class="font-medium text-[var(--text-primary)] truncate">
                    {artist.name}
                </div>

                <!-- Albums -->
                <div class="text-right tabular-nums">
                    {artist.albumCount || 0}
                </div>

                <!-- Starred -->
                <div class="flex justify-center">
                    <button
                        onclick={(e) => toggleArtistFavorite(artist, e)}
                        class="p-1.5 rounded-full hover:bg-[var(--text-primary)]/10 transition-colors {artist.starred
                            ? 'opacity-100'
                            : 'opacity-0 group-hover:opacity-100'}"
                    >
                        <Heart
                            size={16}
                            class={artist.starred
                                ? "text-red-500 fill-red-500"
                                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}
                        />
                    </button>
                </div>
            </a>
        {/each}
    </div>
</div>
