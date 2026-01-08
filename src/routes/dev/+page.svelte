<script>
    import { subsonicFetch } from "$lib/subsonic";

    let endpoint = "ping";
    let params = ""; // e.g., "&type=random"

    /** @type {any} */
    let response = null;
    let loading = false;
    /** @type {string | null} */
    let error = null;

    async function runRequest() {
        loading = true;
        error = null;
        response = null;
        try {
            // Ensure params starts with & if not empty (helper convenience)
            let formattedParams = params.trim();
            if (formattedParams && !formattedParams.startsWith("&")) {
                formattedParams = "&" + formattedParams;
            }

            const data = await subsonicFetch(endpoint, formattedParams);
            response = data;
        } catch (/** @type {any} */ e) {
            error = e.message || String(e);
        } finally {
            loading = false;
        }
    }
</script>

<div class="p-8 max-w-6xl mx-auto text-white">
    <h1 class="text-3xl font-bold mb-6">Subsonic API Playground</h1>

    <div class="bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
                <label
                    for="endpoint"
                    class="block text-sm font-medium text-gray-400 mb-1"
                    >Endpoint</label
                >
                <input
                    id="endpoint"
                    type="text"
                    bind:value={endpoint}
                    placeholder="e.g. getAlbumList"
                    class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
                <p class="text-xs text-gray-500 mt-1">Do not include '.view'</p>
            </div>
            <div>
                <label
                    for="params"
                    class="block text-sm font-medium text-gray-400 mb-1"
                    >Query Params</label
                >
                <input
                    id="params"
                    type="text"
                    bind:value={params}
                    placeholder="e.g. &type=random&size=10"
                    class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
            </div>
        </div>

        <button
            on:click={runRequest}
            disabled={loading}
            class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {loading ? "Sending..." : "Send Request"}
        </button>
    </div>

    {#if error}
        <div
            class="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded mb-8"
        >
            <h3 class="font-bold">Error</h3>
            <p>{error}</p>
        </div>
    {/if}

    {#if response}
        <div
            class="bg-gray-900 p-6 rounded-lg border border-gray-700 overflow-x-auto"
        >
            <h2 class="text-xl font-bold mb-4 text-gray-300">Response</h2>
            <pre
                class="font-mono text-sm text-green-400 whitespace-pre-wrap">{JSON.stringify(
                    response,
                    null,
                    2,
                )}</pre>
        </div>
    {:else if !loading && !error}
        <div class="text-gray-500 text-center italic mt-12">
            Result will appear here...
        </div>
    {/if}
</div>
