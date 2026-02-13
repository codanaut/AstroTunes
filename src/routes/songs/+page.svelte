<script>
    import { onMount } from "svelte";
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";
    import { searchSongs, starTrack, unstarTrack } from "../../lib/subsonic.js";
    import { playQueue, currentTrack, isPlaying } from "../../lib/player.js";
    import {
        Heart,
        Clock,
        Music,
        ChevronLeft,
        ChevronRight,
        Disc, // Album icon
    } from "lucide-svelte";
    import { resolve } from "$app/paths";
    import SongList from "../../lib/components/SongList.svelte";

    /** @type {any[]} */
    let songs = [];
    let loading = true;
    let totalSongs = 0;
    const limit = 50;

    $: currentPage = Number($page.url.searchParams.get("page")) || 1;
    $: offset = (currentPage - 1) * limit;

    async function loadSongs() {
        loading = true;
        try {
            // Revert to empty query as wildcard fails on some servers
            const result = await searchSongs("", offset, limit);
            if (result && result.searchResult3) {
                if (result.searchResult3.song) {
                    songs = result.searchResult3.song;
                } else {
                    songs = [];
                }
                // Update total songs count
                if (result.searchResult3.totalHits !== undefined) {
                    totalSongs = result.searchResult3.totalHits;
                }
            } else {
                songs = [];
            }
        } catch (e) {
            console.error("Error loading songs:", e);
        } finally {
            loading = false;
        }
    }

    $: if (currentPage) {
        loadSongs();
    }

    /**
     * Toggle starred status for a song
     * @param {any} song
     * @param {Event} event
     */
    async function toggleSongFavorite(song, event) {
        event.stopPropagation();
        const isStarred = !!song.starred;
        try {
            if (isStarred) {
                await unstarTrack(song.id);
                song.starred = undefined;
            } else {
                await starTrack(song.id);
                song.starred = new Date().toISOString();
            }
            songs = songs; // Force update
        } catch (error) {
            console.error("Failed to toggle song favorite:", error);
        }
    }

    /** @param {number} index */
    function playSong(index) {
        if (songs.length > 0) {
            playQueue(songs, index, {
                type: "songs",
                id: "all",
                name: "All Songs",
            });
        }
    }

    /** @param {number} seconds */
    function formatDuration(seconds) {
        const min = Math.floor(seconds / 60);
        const sec = seconds % 60;
        return `${min}:${sec.toString().padStart(2, "0")}`;
    }

    function nextPage() {
        goto(resolve(`/songs`) + `?page=${currentPage + 1}`);
    }

    function prevPage() {
        if (currentPage > 1) {
            goto(resolve(`/songs`) + `?page=${currentPage - 1}`);
        }
    }
</script>

<div class="container mx-auto p-6 pb-24">
    <SongList {songs} />
</div>
