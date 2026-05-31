<script>
    import { page } from "$app/stores";
    import {
        isPlaying,
        currentTrack,
        togglePlay,
        playNext,
        playPrev,
        progress,
        buffered,
        duration,
        seek,
        volume,
        setVolume,
        repeatMode,
        toggleRepeat,
        isFavorite,
        toggleFavorite,
        showQueue,
        toggleQueue,
        closePlayer,
        context,
    } from "$lib/player.js";
    import { getCoverArtUrl } from "$lib/subsonic.js";
    import OptionsButton from "$lib/components/OptionsButton.svelte";
    import { parseArtistString } from "$lib/utils/artistUtils";
    import {
        Play,
        Pause,
        SkipForward,
        SkipBack,
        ListMusic,
        Volume2,
        VolumeX,
        Repeat,
        Repeat1,
        Heart,
        X,
        Maximize2,
    } from "lucide-svelte";
    import { resolve } from "$app/paths";

    // --- LOCAL UI STATE ---
    let isDraggingVolume = $state(false);
    let isMuted = $state(false);
    let previousVolume = $state(1.0);

    // --- FORMATTING HELPERS ---
    /**
     * Formats the sample rate of a track.
     * @param {number} rate - The sample rate of the track.
     * @returns {string} The formatted sample rate.
     */
    function formatSampleRate(rate) {
        if (!rate) return "";
        return rate >= 1000 ? (rate / 1000).toFixed(1) + " kHz" : rate + " Hz";
    }

    /**
     * Formats the bit depth of a track.
     * @param {number} depth - The bit depth of the track.
     * @returns {string} The formatted bit depth.
     */
    function formatBitDepth(depth) {
        return depth ? depth + "bit" : "";
    }

    // --- INTERACTION HANDLERS ---
    /** @param {MouseEvent & { currentTarget: HTMLDivElement }} e */
    function handleSeek(e) {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        seek((x / rect.width) * $duration);
    }

    /** @param {MouseEvent & { currentTarget: HTMLDivElement }} e */
    function handleVolumeChange(e) {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, x / rect.width));
        setVolume(percentage);
    }

    /** @param {MouseEvent & { currentTarget: HTMLDivElement }} e */
    function handleVolumeMouseDown(e) {
        isDraggingVolume = true;
        handleVolumeChange(e);
    }

    /** @param {MouseEvent} e */
    export function handleGlobalMouseMove(e) {
        if (isDraggingVolume) {
            const bar = document.querySelector(".volume-slider");
            if (bar) {
                const rect = bar.getBoundingClientRect();
                const x = e.clientX - rect.left;
                setVolume(Math.max(0, Math.min(1, x / rect.width)));
            }
        }
    }

    export function handleGlobalMouseUp() {
        isDraggingVolume = false;
    }

    /** @param {WheelEvent} e */
    function handleVolumeWheel(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        const newVolume = Math.max(0, Math.min(1, $volume + delta));
        setVolume(newVolume);
        if (newVolume > 0) isMuted = false;
    }

    function toggleMute() {
        if (isMuted) {
            setVolume(previousVolume);
            isMuted = false;
        } else {
            previousVolume = $volume;
            setVolume(0);
            isMuted = true;
        }
    }

    let isNowPlayingPage = $derived(
        $page.url.pathname === resolve("/now-playing"),
    );
</script>

<div
    class="absolute left-1/2 -translate-x-1/2 w-[98%] max-w-5xl h-24 z-50
         transition-all duration-500 ease-in-out
         {isNowPlayingPage
        ? 'translate-y-40 opacity-0 pointer-events-none'
        : 'translate-y-0 opacity-100'}
         flex items-center justify-between bg-[var(--bg-sidebar)]/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl px-3 gap-4"
    style="bottom: calc(0.5rem + env(safe-area-inset-bottom));"
>
    <a
        href={resolve("/now-playing")}
        class="md:hidden absolute inset-0 z-10 flex justify-center"
        aria-label="Open Now Playing"
    >
        <div class="w-8 h-1 bg-white/20 rounded-b-full absolute top-0"></div>
    </a>

    <div
        class="flex items-center flex-1 min-w-0 gap-2 md:mr-4 z-20 relative pointer-events-none md:pointer-events-auto"
    >
        <a
            href={resolve(`/album/${$currentTrack.albumId}`)}
            class="pointer-events-auto"
        >
            <img
                src={getCoverArtUrl($currentTrack.id)}
                alt="Art"
                class="h-12 w-12 md:h-16 md:w-16 rounded-md bg-[var(--bg-card)] mr-3 md:mr-4 object-cover shadow-lg"
            />
        </a>
        <div class="truncate flex flex-col justify-center pointer-events-auto">
            <div
                class="font-bold text-[var(--text-primary)] truncate text-base md:text-lg leading-tight"
            >
                {$currentTrack.title}
            </div>
            <div
                class="flex items-center gap-2 text-xs md:text-sm text-[var(--text-secondary)] truncate"
            >
                <span class="truncate">
                    {#each parseArtistString($currentTrack.artist, $currentTrack.artistId, $currentTrack.artists) as part}
                        {#if part.type === "artist"}
                            <a
                                href={part.id
                                    ? resolve(`/artist/${part.id}`)
                                    : resolve("/search") +
                                      `?q=${encodeURIComponent(part.name)}`}
                                class="hover:text-[var(--accent)] transition-colors"
                                >{part.name}</a
                            >
                        {:else}
                            <span>{part.name}</span>
                        {/if}
                    {/each}
                </span>
                <span class="text-[var(--text-muted)]">•</span>
                <a
                    class="hover:text-[var(--accent)] transition-colors truncate"
                    href={resolve(`/album/${$currentTrack.albumId}`)}
                    >{$currentTrack.album}</a
                >
            </div>
            {#if $context && $context.type && $context.name}
                <div
                    class="text-[10px] uppercase tracking-wider text-[var(--accent)] mt-0.5 truncate hidden md:block"
                >
                    Playing from:
                    <a
                        href={$context.type === "favorites"
                            ? resolve("/favorites")
                            : $context.type === "search"
                              ? resolve("/search") +
                                `?q=${encodeURIComponent($context.id || "")}`
                              : $context.type === "playlist"
                                ? resolve("/playlists") +
                                  `?id=${encodeURIComponent($context.id || "")}`
                                : $context.type === "album"
                                  ? resolve("/album") +
                                    `/${encodeURIComponent($context.id || "")}`
                                  : resolve("/artist") +
                                    `/${encodeURIComponent($context.id || "")}`}
                        class="hover:underline font-bold"
                    >
                        {$context.name}
                    </a>
                </div>
            {/if}
        </div>
    </div>

    <!-- Playback Controls -->
    <div class="flex flex-col items-center flex-none z-20 relative">
        <div class="flex items-center gap-2 md:gap-4 mb-0 md:mb-2">
            <button
                onclick={toggleRepeat}
                class="hidden md:block text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                title="Repeat: {$repeatMode}"
            >
                {#if $repeatMode === "one"}<Repeat1
                        size={20}
                        class="text-[var(--accent)]"
                    />
                {:else if $repeatMode === "all"}<Repeat
                        size={20}
                        class="text-[var(--accent)]"
                    />
                {:else}<Repeat size={20} />{/if}
            </button>

            <button
                onclick={playPrev}
                class="text-[var(--text-secondary)] hover:text-[var(--text-secondary)] transition-colors"
                ><SkipBack size={20} class="md:w-6 md:h-6" /></button
            >

            <button
                onclick={togglePlay}
                class="p-2 md:p-3 rounded-full text-[var(--bg-primary)] hover:scale-105 transition-transform"
            >
                {#if $isPlaying}<Pause
                        size={20}
                        fill="currentColor"
                        class="md:w-6 md:h-6"
                    />
                {:else}<Play
                        size={20}
                        fill="currentColor"
                        class="ml-0.5 md:ml-1 md:w-6 md:h-6"
                    />{/if}
            </button>

            <button
                onclick={playNext}
                class="text-[var(--text-secondary)] hover:text-[var(--text-secondary)] transition-colors"
                ><SkipForward size={20} class="md:w-6 md:h-6" /></button
            >

            <button
                onclick={toggleFavorite}
                class="hidden md:block text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                title="Favorite"
            >
                <Heart
                    size={20}
                    class={$isFavorite ? "text-red-500 fill-red-500" : ""}
                />
            </button>
        </div>

        <div
            class="hidden md:flex w-full items-center gap-3 text-xs text-[var(--text-secondary)] font-mono"
        >
            <span>{new Date($progress * 1000).toISOString().substr(14, 5)}</span
            >
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <div
                class="w-64 h-1.5 bg-[var(--bg-hover)] rounded-full relative cursor-pointer group"
                onclick={handleSeek}
            >
                <!-- Buffer Bar -->
                <div
                    class="h-full bg-white/25 rounded-full absolute top-0 left-0 transition-[width] duration-300"
                    style="width: {$buffered * 100}%"
                ></div>
                <!-- Progress Fill -->
                <div
                    class="h-full bg-[var(--text-primary)] rounded-full absolute top-0 left-0 group-hover:bg-[var(--accent)] transition-colors"
                    style="width: {($progress / $duration) * 100}%"
                ></div>
            </div>
            <span>{new Date($duration * 1000).toISOString().substr(14, 5)}</span
            >
        </div>
    </div>

    <div class="hidden md:flex justify-end gap-4 items-center flex-1 min-w-0">
        <div
            class="flex flex-col items-end text-xs text-[var(--text-secondary)] mr-2"
        >
            <span class="font-semibold text-[var(--text-secondary)] uppercase"
                >{$currentTrack.suffix}</span
            >
            <span class="text-right">
                {formatBitDepth($currentTrack.bitDepth)}
                {formatSampleRate($currentTrack.samplingRate)}
            </span>
        </div>

        <OptionsButton
            item={$currentTrack}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        />

        <button
            onclick={toggleQueue}
            class="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            title="Queue"
        >
            <ListMusic
                size={20}
                class={$showQueue ? "text-[var(--accent)]" : ""}
            />
        </button>

        <button
            onclick={toggleMute}
            class="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
            {#if isMuted}<VolumeX size={20} />{:else}<Volume2 size={20} />{/if}
        </button>

        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
            class="volume-slider w-24 h-1.5 bg-[var(--bg-hover)] rounded-full relative cursor-pointer group"
            onmousedown={handleVolumeMouseDown}
            onwheel={handleVolumeWheel}
        >
            <div
                class="h-full bg-[var(--text-primary)] rounded-full absolute top-0 left-0 group-hover:bg-[var(--accent)] transition-colors"
                style="width: {$volume * 100}%"
            ></div>
        </div>

        <a
            href={resolve("/now-playing")}
            class="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors ml-2"
            title="Expand Player"><Maximize2 size={20} /></a
        >
        <button
            onclick={closePlayer}
            class="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors ml-2"
            title="Close Player"><X size={20} /></button
        >
    </div>
</div>
