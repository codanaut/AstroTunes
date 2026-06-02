<script>
    import {
        Moon,
        Sun,
        Check,
        Zap,
        CloudRain,
        Coffee,
        Rocket,
        Trees,
    } from "lucide-svelte";
    import { auth } from "$lib/auth";
    import { theme } from "$lib/stores/theme";
    import { subsonicFetch } from "$lib/subsonic";
    import { goto } from "$app/navigation";
    import {
        Loader2,
        Server,
        Music,
        Settings,
        Palette,
        Play,
    } from "lucide-svelte";
    import AccentColorPicker from "$lib/components/AccentColorPicker.svelte";
    import { crossfadeDuration } from "$lib/player";

    let serverUrl = $state("");
    let username = $state("");
    let password = $state("");
    let loading = $state(false);
    let error = $state("");

    let serverVersion = $state("");

    async function getServerVersion() {
        const res = await subsonicFetch("ping");
        try {
            const data = await res;
            serverVersion = data.serverVersion;
        } catch (e) {
            console.error(e);
        }
    }

    getServerVersion();

    async function handleLogin() {
        loading = true;
        error = "";

        // Temporary save to store to attempt connection
        auth.set({ serverUrl, username, password, isConnected: false });

        // Basic validation: try to fetch something simple, e.g. ping
        const res = await subsonicFetch("ping");

        if (res && res.status === "ok") {
            auth.save({ serverUrl, username, password, isConnected: true });
        } else {
            error =
                "Connection failed. Please check your credentials and server URL.";
            auth.set({
                serverUrl: "",
                username: "",
                password: "",
                isConnected: false,
            });
        }
        loading = false;
    }

    function handleLogout() {
        auth.logout();
        serverUrl = "";
        username = "";
        password = "";
    }

    // Load existing values if any (for editing)
    $effect(() => {
        if ($auth.serverUrl) serverUrl = $auth.serverUrl;
        if ($auth.username) username = $auth.username;
        if ($auth.password) password = $auth.password;
    });

    const themes = [
        { id: "dark", name: "Dark", icon: Moon },
        { id: "light", name: "Light", icon: Sun },
        { id: "forest", name: "Forest", icon: Trees },
        { id: "space", name: "Space", icon: Rocket },
    ];
</script>

<div class="container mx-auto max-w-4xl p-8 mb-20">
    <div class="flex items-center gap-4 mb-8">
        <div
            class="w-12 h-12 bg-[var(--bg-card)] rounded-full flex items-center justify-center"
        >
            <Settings size={24} class="text-[var(--text-primary)]" />
        </div>
        <h1 class="text-3xl font-bold text-[var(--accent)]">Settings</h1>
    </div>

    <div class="grid gap-8">
        <!-- SERVER CONNECTION SECTION -->
        <section
            class="bg-[var(--bg-sidebar)] border border-[var(--border-primary)] rounded-xl overflow-hidden"
        >
            <div
                class="p-6 border-b border-[var(--border-primary)] flex items-center gap-3 bg-[var(--bg-main)]/50"
            >
                <Server size={20} class="text-[var(--accent)]" />
                <h2 class="text-lg font-semibold text-[var(--text-primary)]">
                    Server Connection
                </h2>
            </div>

            <div class="p-6">
                <p class="text-[var(--text-secondary)] mb-6 text-sm">
                    Connect to your Subsonic-compatible server (Navidrome,
                    Gonic, etc.) to access your music library.
                </p>

                {#if error}
                    <div
                        class="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-lg mb-6 text-sm"
                    >
                        {error}
                    </div>
                {/if}

                <form
                    class="space-y-4 max-w-xl"
                    onsubmit={(e) => {
                        e.preventDefault();
                        handleLogin();
                    }}
                >
                    <div>
                        <label
                            for="server"
                            class="block text-sm font-medium text-[var(--text-secondary)] mb-1"
                            >Server URL</label
                        >
                        <input
                            type="url"
                            id="server"
                            bind:value={serverUrl}
                            placeholder="https://music.example.com"
                            required
                            class="w-full bg-[var(--bg-main)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-lg px-4 py-3 focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all placeholder-[var(--text-muted)]"
                        />
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label
                                for="username"
                                class="block text-sm font-medium text-[var(--text-secondary)] mb-1"
                                >Username</label
                            >
                            <input
                                type="text"
                                id="username"
                                bind:value={username}
                                required
                                class="w-full bg-[var(--bg-main)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-lg px-4 py-3 focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all placeholder-[var(--text-muted)]"
                            />
                        </div>

                        <div>
                            <label
                                for="password"
                                class="block text-sm font-medium text-[var(--text-secondary)] mb-1"
                                >Password</label
                            >
                            <input
                                type="password"
                                id="password"
                                bind:value={password}
                                required
                                class="w-full bg-[var(--bg-main)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-lg px-4 py-3 focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all placeholder-[var(--text-muted)]"
                            />
                        </div>
                    </div>

                    <div
                        class="flex flex-col md:flex-row md:items-center gap-4 mt-6"
                    >
                        <div
                            class="flex items-center gap-4 order-1 md:order-none"
                        >
                            <button
                                type="submit"
                                disabled={loading}
                                class="flex-1 md:flex-none bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-[var(--accent-fg)] font-bold py-2.5 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {#if loading}
                                    <Loader2 size={18} class="animate-spin" />
                                    Connecting...
                                {:else}
                                    Save & Connect
                                {/if}
                            </button>

                            {#if $auth.isConnected}
                                <button
                                    type="button"
                                    onclick={handleLogout}
                                    class="flex-1 md:flex-none bg-red-500 hover:bg-red-600 text-white font-bold py-2.5 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                                >
                                    Logout
                                </button>
                            {/if}
                        </div>

                        {#if $auth.isConnected}
                            <div
                                class="text-[var(--primary)] text-sm font-medium flex items-center gap-2 md:ml-auto order-2 md:order-none px-1"
                            >
                                <div
                                    class="w-2 h-2 bg-green-500 rounded-full"
                                ></div>
                                <div>
                                    <div>
                                        Connected as{" "}
                                        <span class="text-[var(--accent)]"
                                            >{$auth.username}</span
                                        >
                                    </div>
                                    <div>Server Version: {serverVersion}</div>
                                </div>
                            </div>
                        {/if}
                    </div>
                </form>
            </div>
        </section>

        <!-- PLAYBACK SETTINGS -->
        <section
            class="bg-[var(--bg-sidebar)] border border-[var(--border-primary)] rounded-xl overflow-hidden"
        >
            <div
                class="p-6 border-b border-[var(--border-primary)] flex items-center gap-3 bg-[var(--bg-main)]/50"
            >
                <Music size={20} class="text-[var(--accent)]" />
                <h2 class="text-lg font-semibold text-[var(--text-primary)]">
                    Playback
                </h2>
            </div>
            <div class="p-6 space-y-6">
                <div>
                    <div class="flex items-center justify-between mb-4">
                        <div>
                            <h3 class="text-[var(--text-primary)] font-medium">
                                Crossfade
                            </h3>
                            <p class="text-[var(--text-muted)] text-xs">
                                Overlap songs for a smoother transition.
                            </p>
                        </div>
                        <span class="text-[var(--accent)] font-mono text-sm"
                            >{$crossfadeDuration}s</span
                        >
                    </div>

                    <input
                        type="range"
                        min="0"
                        max="10"
                        step="1"
                        bind:value={$crossfadeDuration}
                        class="w-full h-1.5 bg-[var(--bg-main)] rounded-full appearance-none cursor-pointer accent-[var(--accent)] border border-[var(--border-primary)]"
                    />
                    <div
                        class="flex justify-between mt-2 text-[10px] text-[var(--text-muted)] font-mono"
                    >
                        <span>OFF</span>
                        <span>5s</span>
                        <span>10s</span>
                    </div>
                </div>
            </div>
        </section>

        <!-- THEME SETTINGS -->
        <section
            class="bg-[var(--bg-sidebar)] border border-[var(--border-primary)] rounded-xl overflow-hidden"
        >
            <div
                class="p-6 border-b border-[var(--border-primary)] flex items-center gap-3 bg-[var(--bg-main)]/50"
            >
                <Palette size={20} class="text-[var(--accent)]" />
                <h2 class="text-lg font-semibold text-[var(--text-primary)]">
                    Appearance
                </h2>
            </div>

            <div class="p-6 space-y-8">
                <div>
                    <p class="text-[var(--text-secondary)] text-sm mb-4">
                        Choose your preferred appearance mode.
                    </p>

                    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {#each themes as t}
                            <button
                                class="flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all text-sm font-medium border
                                {$theme.mode === t.id
                                    ? 'bg-[var(--bg-card)] text-[var(--accent)] border-[var(--accent)] shadow-sm'
                                    : 'bg-[var(--bg-main)] text-[var(--text-secondary)] border-[var(--border-primary)] hover:bg-[var(--bg-hover)]'}"
                                onclick={() =>
                                    theme.updateProperty("mode", t.id)}
                                aria-label="Select {t.name} theme"
                            >
                                <t.icon size={18} />
                                {t.name}
                            </button>
                        {/each}
                    </div>
                </div>

                <!-- True Black Toggle -->
                <!--{#if $theme.mode === "dark" || $theme.mode === "forest"}-->
                {#if $theme.mode === "dark"}
                    <div
                        class="flex items-center justify-between border-t border-[var(--border-primary)] pt-4"
                    >
                        <div>
                            <h3 class="text-[var(--text-primary)] font-medium">
                                True Black
                            </h3>
                            <p class="text-[var(--text-muted)] text-xs">
                                Optimized for OLED screens.
                            </p>
                        </div>
                        <button
                            class="w-12 h-6 rounded-full transition-colors relative focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--bg-card)]
                            {$theme.trueBlack
                                ? 'bg-[var(--accent)]'
                                : 'bg-[var(--bg-hover)]'}"
                            onclick={() =>
                                theme.updateProperty(
                                    "trueBlack",
                                    !$theme.trueBlack,
                                )}
                            aria-label="Toggle True Black mode"
                        >
                            <div
                                class="absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform
                                {$theme.trueBlack
                                    ? 'translate-x-6'
                                    : 'translate-x-0'}"
                            ></div>
                        </button>
                    </div>
                {/if}

                <AccentColorPicker />
            </div>
        </section>

        <section
            class="bg-[var(--bg-sidebar)] border border-[var(--border-primary)] rounded-xl overflow-hidden"
        >
            <div
                class="p-6 border-b border-[var(--border-primary)] flex items-center gap-3 bg-[var(--bg-main)]/50"
            >
                <Settings size={20} class="text-[var(--accent)]" />
                <h2 class="text-lg font-semibold text-[var(--text-primary)]">
                    About AstroTunes
                </h2>
            </div>

            <div class="p-6 text-sm space-y-2">
                <p class="text-[var(--text-primary)] font-medium">
                    Version: <span
                        class="font-mono bg-[var(--bg-main)] px-2 py-0.5 rounded border border-[var(--border-primary)] text-[var(--accent)]"
                        >{__APP_VERSION__}</span
                    >
                </p>
                <p>
                    Github:{" "}
                    <a
                        href="https://github.com/codanaut/AstroTunes"
                        class="text-[var(--accent)] underline"
                        target="_blank">github.com/codanaut/AstroTunes</a
                    >
                </p>
            </div>
        </section>
    </div>
</div>
