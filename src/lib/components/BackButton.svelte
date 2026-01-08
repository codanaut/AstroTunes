<script>
    import { ArrowLeft } from "lucide-svelte";

    /** @type {string} */
    export let label = "Back";
    /** @type {() => void} */
    export let onclick = () => window.history.back();
</script>

<button
    {onclick}
    class="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4 group"
    title={label}
>
    <div
        class="p-2 rounded-full bg-gray-800/50 group-hover:bg-gray-700 transition-colors"
    >
        <ArrowLeft size={20} />
    </div>
    <span class="font-medium">{label}</span>
</button>
