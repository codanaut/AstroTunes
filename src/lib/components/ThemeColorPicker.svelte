<script>
    import { theme } from "$lib/stores/theme";
    import { Check } from "lucide-svelte";

    const accents = [
        { id: "green", color: "#22c55e", name: "Green" },
        { id: "red", color: "#ef4444", name: "Red" },
        { id: "blue", color: "#3b82f6", name: "Blue" },
        { id: "orange", color: "#f97316", name: "Orange" },
        { id: "purple", color: "#a855f7", name: "Purple" },
        { id: "pink", color: "#ec4899", name: "Pink" },
    ];
</script>

<div class="border-t border-[var(--border-primary)] pt-4">
    <h3 class="text-[var(--text-primary)] font-medium mb-3">Accent Color</h3>
    <div class="flex flex-wrap gap-3">
        {#each accents as accent}
            <button
                class="w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--bg-card)]"
                style="background-color: {accent.color}; --tw-ring-color: {accent.color}"
                onclick={() => theme.updateProperty("accent", accent.id)}
                title={accent.name}
                aria-label="Select {accent.name} accent color"
            >
                {#if $theme.accent === accent.id}
                    <Check size={20} class="text-white drop-shadow-md" />
                {/if}
            </button>
        {/each}
    </div>
</div>
