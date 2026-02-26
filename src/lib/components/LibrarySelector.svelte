<script>
    import { Library } from "lucide-svelte";
    import { libraryStore } from "../stores/library.js";

    // Only render when user has multiple libraries
    let hasMultiple = $derived($libraryStore.folders.length > 1);

    /**
     * @param {Event} e
     */
    function handleChange(e) {
        const target = /** @type {HTMLSelectElement} */ (e.target);
        const val = target.value;
        libraryStore.select(val === "" ? null : val);
    }
</script>

{#if hasMultiple}
    <div class="library-selector-wrapper">
        <span class="library-icon">
            <Library size={18} />
        </span>
        <select
            id="library-selector"
            class="library-selector"
            value={$libraryStore.selectedId ?? ""}
            onchange={handleChange}
            title="Select Library"
        >
            <option value="">All Libraries</option>
            {#each $libraryStore.folders as folder (folder.id)}
                <option value={folder.id}>{folder.name}</option>
            {/each}
        </select>
    </div>
{/if}

<style>
    .library-selector-wrapper {
        display: flex;
        align-items: center;
        gap: 6px;
        position: relative;
    }

    .library-icon {
        color: var(--text-secondary);
        display: flex;
        align-items: center;
        flex-shrink: 0;
        pointer-events: none;
        z-index: 10; /* ensure it stays above the select on mobile */
    }

    .library-selector {
        appearance: none;
        background: var(--bg-card);
        border: 1px solid var(--border-primary);
        border-radius: 8px;
        color: var(--text-primary);
        cursor: pointer;
        font-size: 0.8125rem;
        font-weight: 500;
        padding: 6px 28px 6px 10px;
        transition:
            border-color 0.2s,
            box-shadow 0.2s;
        max-width: 160px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        /* Custom dropdown arrow using current color */
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 8px center;
    }

    .library-selector:hover {
        border-color: var(--accent);
    }

    .library-selector:focus {
        outline: none;
        border-color: var(--accent);
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 25%, transparent);
    }

    .library-selector option {
        background: var(--bg-card);
        color: var(--text-primary);
    }

    /* Mobile styling: collapse text to just the icon */
    @media (max-width: 768px) {
        .library-selector-wrapper {
            /* Position icon absolutely over the select on mobile */
            gap: 0;
        }

        .library-icon {
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            /* Accent color on mobile to make it look like a button */
            color: var(--text-primary);
        }

        .library-selector {
            /* Make the select invisible but still clickable */
            width: 36px;
            height: 36px;
            padding: 0;
            color: transparent;
            background: transparent;
            border-color: transparent;
            background-image: none; /* remove arrow */
        }

        .library-selector:hover,
        .library-selector:focus {
            background: var(--bg-card);
            border-color: var(--border-primary);
        }
    }
</style>
