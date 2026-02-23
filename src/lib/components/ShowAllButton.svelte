<script>
    import { ArrowRight } from "lucide-svelte";

    let { label = "Show All", href = "#" } = $props();
</script>

<a
    {href}
    class="inline-flex items-center gap-1.5 text-[var(--text-muted)] hover:text-[var(--accent)] transition-all group text-sm font-medium"
    title={label}
>
    <span>{label}</span>
    <ArrowRight
        size={16}
        class="transform group-hover:translate-x-1 transition-transform"
    />
</a>
