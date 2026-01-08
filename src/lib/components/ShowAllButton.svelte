<script>
    import { ArrowRight } from "lucide-svelte";

    /** @type {string} */
    export let label = "Show All";
    /** @type {string} */
    export let href = "#";
</script>

<a
    {href}
    class="inline-flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors group"
    title={label}
>
    <span class="font-medium">{label}</span>
    <div
        class="p-2 rounded-full bg-[var(--bg-card)] border border-[var(--border-primary)] group-hover:bg-[var(--bg-hover)] transition-colors"
    >
        <ArrowRight size={20} />
    </div>
</a>
