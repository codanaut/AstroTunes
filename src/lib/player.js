import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
// @ts-ignore - Ignores missing type definitions for howler
import { Howl, Howler } from 'howler';
import { getStreamUrl, getCoverArtUrl } from './subsonic.js';

// STATE
const STATE_KEY = 'player_state';

/**
 * @type {any}
 */
let initialState = {
    queue: [],
    currentTrack: null,
    volume: 1.0,
    repeatMode: 'off',
    context: null,
    progress: 0,
    duration: 0
};

if (browser) {
    const stored = localStorage.getItem(STATE_KEY);
    if (stored) {
        try {
            initialState = { ...initialState, ...JSON.parse(stored) };
        } catch (e) {
            console.error("Failed to parse player state", e);
        }
    }
}

export const isPlaying = writable(false);
/** @type {import('svelte/store').Writable<any>} */
export const currentTrack = writable(initialState.currentTrack); // The song object
/** @type {import('svelte/store').Writable<any[]>} */
export const queue = writable(initialState.queue); // Array of songs
export const progress = writable(initialState.progress); // Current time in seconds
export const buffered = writable(0); // Buffered time as percentage (0 to 1)
export const duration = writable(initialState.duration); // Total time in seconds
export const repeatMode = writable(initialState.repeatMode); // 'off', 'all', 'one'
export const isFavorite = writable(initialState.currentTrack?.starred ? true : false); // Whether current track is favorited
export const showQueue = writable(false); // Whether queue panel is visible
export const showPlayer = writable(initialState.currentTrack ? true : false); // Whether player bar is visible

// Create persisted crossfadeDuration
const initialCrossfade = browser ? parseInt(localStorage.getItem('crossfade_duration') || '0') : 0;
export const crossfadeDuration = writable(initialCrossfade);
if (browser) {
    crossfadeDuration.subscribe(val => {
        localStorage.setItem('crossfade_duration', val.toString());
    });
}

/** @type {import('svelte/store').Writable<{type: string|null, id: string|null, name: string|null} | null>} */
export const context = writable(initialState.context); // Context of current playback

export const volume = writable(initialState.volume); // 0.0 to 1.0

if (browser) {
    Howler.volume(initialState.volume);
}

/** @type {Howl | null} */
let sound = null;
/** @type {Howl | null} */
let nextSound = null;
/** @type {Howl | null} */
let fadingSound = null;
/** @type {any} */
let nextTrackMetadata = null;
/** @type {boolean} */
let isCrossfading = false;
/** @type {boolean} */
let needsPositionRestoration = initialState.progress > 0;

/** @type {any} */
let progressInterval = null;
/** @type {any} */
let starredCheckInterval = null;

// Helper to save state
function saveState() {
    if (!browser) return;

    const currentProgress = get(progress);
    const currentDuration = get(duration);

    // Don't save if we are in the middle of a restoration and haven't finished yet
    if (needsPositionRestoration && currentProgress === 0) return;

    const state = {
        queue: get(queue),
        currentTrack: get(currentTrack),
        volume: get(volume),
        repeatMode: get(repeatMode),
        context: get(context),
        progress: currentProgress,
        duration: currentDuration > 0 ? currentDuration : initialState.duration
    };
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

// Subscribe to changes (except progress and duration which are handled carefully)
if (browser) {
    queue.subscribe(() => saveState());
    volume.subscribe(() => saveState());
    repeatMode.subscribe(() => saveState());
    context.subscribe(() => saveState());
    // We don't subscribe to currentTrack or duration directly to avoid 
    // saving 0 values before they are loaded/restored.
}

// FUNCTIONS

/**
 * Updates the OS Media Session metadata and handlers
 * @param {any} track 
 */
function updateMediaSession(track) {
    if (!track || typeof navigator === 'undefined' || !navigator.mediaSession) return;

    navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: track.album,
        artwork: [
            { src: getCoverArtUrl(track.id, 96), sizes: '96x96', type: 'image/png' },
            { src: getCoverArtUrl(track.id, 128), sizes: '128x128', type: 'image/png' },
            { src: getCoverArtUrl(track.id, 192), sizes: '192x192', type: 'image/png' },
            { src: getCoverArtUrl(track.id, 256), sizes: '256x256', type: 'image/png' },
            { src: getCoverArtUrl(track.id, 384), sizes: '384x384', type: 'image/png' },
            { src: getCoverArtUrl(track.id, 512), sizes: '512x512', type: 'image/png' },
        ]
    });

    navigator.mediaSession.setActionHandler('play', () => togglePlay());
    navigator.mediaSession.setActionHandler('pause', () => togglePlay());
    navigator.mediaSession.setActionHandler('previoustrack', () => playPrev());
    navigator.mediaSession.setActionHandler('nexttrack', () => playNext());
    navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) seek(details.seekTime);
    });
}

/**
 * Cleans up existing audio and intervals
 */
function cleanup() {
    if (sound) {
        sound.unload();
        sound = null;
    }
    if (fadingSound) {
        fadingSound.unload();
        fadingSound = null;
    }
    isCrossfading = false;
    clearInterval(progressInterval);
    clearInterval(starredCheckInterval);
}

/**
 * Prebuffering: Loads the next song in the queue
 */
function prepareNextTrack() {
    const q = get(queue);
    const curr = get(currentTrack);
    if (!curr || q.length <= 1) return;

    const index = curr.queueId
        ? q.findIndex(s => s.queueId === curr.queueId)
        : q.findIndex(s => s.id === curr.id);

    let nextIndex = -1;
    if (index < q.length - 1) {
        nextIndex = index + 1;
    } else if (get(repeatMode) === 'all') {
        nextIndex = 0;
    }

    if (nextIndex !== -1) {
        const nextTrack = q[nextIndex];
        // Don't re-buffer if already buffered
        if (nextTrackMetadata && nextTrackMetadata.id === nextTrack.id) return;

        if (nextSound) nextSound.unload();

        nextTrackMetadata = nextTrack;
        nextSound = new Howl({
            src: [getStreamUrl(nextTrack.id)],
            html5: true,
            format: ['mp3', 'flac'],
            volume: 1.0,
            preload: true
        });
    }
}

// Create a safe UUID fallback
const generateId = () => {
    return typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2, 11);
};

/**
 * Loads a list of songs and plays the first one (or specific index)
 * @param {Array<any>} newQueue - Array of song objects
 * @param {number} startIndex 
 * @param {{ type: string, id: string, name: string } | null} queueContext
 */
export function playQueue(newQueue, startIndex = 0, queueContext = null) {
    // Add unique ID for drag and drop operations if not present
    const queueWithIds = newQueue.map(track => ({
        ...track,
        queueId: track.queueId || generateId()
    }));

    queue.set(queueWithIds);
    if (queueContext) {
        context.set(queueContext);
    }
    playTrack(queueWithIds[startIndex]);
}

/**
 * Adds a song to the end of the current queue
 * @param {any} song - The song object to add
 */
export function addToQueue(song) {
    const songWithId = {
        ...song,
        queueId: crypto.randomUUID()
    };

    queue.update(q => [...q, songWithId]);
}

/**
 * Internal function to handle Howler initialization
 * @param {any} track
 */
function playTrack(track) {
    if (!track) return;

    // 1. Logic for prebuffered track
    if (nextSound && nextTrackMetadata && nextTrackMetadata.id === track.id) {
        // We have it prebuffered!
        // Swap currently playing
        if (sound) sound.unload();
        sound = nextSound;
        nextSound = null;
        nextTrackMetadata = null;

        // Restart intervals and state
        currentTrack.set(track);
        isPlaying.set(true);
        isFavorite.set(track.starred ? true : false);

        // Update handlers for the promoted sound
        setupSoundHandlers(sound, track);
        progress.set(0);
        needsPositionRestoration = false; // Never restore position on naturally playing next tracks
        sound.play();
        updateMediaSession(track);
        return;
    }

    // 2. Normal Load (no prebuffer match)
    cleanup();
    if (fadingSound) {
        fadingSound.unload();
        fadingSound = null;
    }
    isCrossfading = false;
    if (nextSound) {
        nextSound.unload();
        nextSound = null;
        nextTrackMetadata = null;
    }

    currentTrack.set(track);
    isPlaying.set(true);
    isFavorite.set(track.starred ? true : false);

    sound = new Howl({
        src: [getStreamUrl(track.id)],
        html5: true,
        format: ['mp3', 'flac'],
        volume: 1.0,
    });

    setupSoundHandlers(sound, track);

    if (needsPositionRestoration) {
        if (initialState.currentTrack && track.id === initialState.currentTrack.id) {
            // Keep needsPositionRestoration true, it will be handled in setupSoundHandlers
        } else {
            needsPositionRestoration = false;
            progress.set(0);
        }
    } else {
        progress.set(0);
    }

    sound.play();
    updateMediaSession(track);
}

/**
 * Setup Howl event handlers
 * @param {Howl} h 
 * @param {any} track 
 */
function setupSoundHandlers(h, track) {
    const handleMetadata = () => {
        const d = h.duration();
        if (d > 0) {
            duration.set(d);

            // Handle one-time position restoration after reload
            if (needsPositionRestoration) {
                const savedPos = initialState.progress;
                if (savedPos > 0 && savedPos < d) {
                    h.seek(savedPos);
                    progress.set(savedPos);
                }
                needsPositionRestoration = false;
            }

            // Save state now that we have good metadata
            saveState();
        }
    };

    h.on('load', handleMetadata);

    h.on('play', () => {
        // Force volume sync on play event to combat HTML5 audio resets
        h.volume(1.0);
        Howler.volume(get(volume));

        handleMetadata();
        startProgressLoop();
        startStarredCheckLoop();
        if (typeof navigator !== 'undefined' && navigator.mediaSession) {
            navigator.mediaSession.playbackState = 'playing';
        }
        import('./subsonic.js').then(({ scrobble }) => {
            scrobble(track.id, false).catch(e => console.error("Failed to set Now Playing:", e));
        });
    });

    h.on('pause', () => {
        if (typeof navigator !== 'undefined' && navigator.mediaSession) {
            navigator.mediaSession.playbackState = 'paused';
        }
    });

    h.on('end', () => {
        if (isCrossfading && h === fadingSound) {
            // This was the old sound that just finished its fade
            return;
        }

        import('./subsonic.js').then(({ scrobble }) => {
            scrobble(track.id, true).catch(e => console.error("Failed to scrobble:", e));
        });

        const repeat = get(repeatMode);
        if (repeat === 'one') {
            h.seek(0);
            h.play();
        } else {
            playNext();
        }
    });

    h.on('loaderror', (/** @type {any} */ _id, /** @type {any} */ err) => {
        console.error("Howler load error:", err);
        // Automatically try next if this one failed
        playNext();
    });
}

export function togglePlay() {
    if (!sound) {
        const track = get(currentTrack);
        if (track) {
            // Check if we were at the end of the song when it was last saved
            const savedPos = initialState.progress;
            const savedDur = initialState.duration;

            // If we were near the end, reset to 0 instead of restoring
            if (savedPos > 0 && savedDur > 0 && savedDur - savedPos < 2) {
                needsPositionRestoration = false;
                progress.set(0);
            }

            playTrack(track);
        }
        return;
    }

    if (sound.playing()) {
        sound.pause();
        isPlaying.set(false);
        if (typeof navigator !== 'undefined' && navigator.mediaSession) {
            navigator.mediaSession.playbackState = 'paused';
        }
    } else {
        sound.play();
        isPlaying.set(true);
        if (typeof navigator !== 'undefined' && navigator.mediaSession) {
            navigator.mediaSession.playbackState = 'playing';
        }
    }
}

export function playNext() {
    const q = get(queue);
    const curr = get(currentTrack);

    // Safety check: ensure current track exists before finding index
    if (!curr) return;

    const index = curr.queueId
        ? q.findIndex(s => s.queueId === curr.queueId)
        : q.findIndex(s => s.id === curr.id);

    if (index < q.length - 1) {
        playTrack(q[index + 1]);
    } else if (get(repeatMode) === 'all') {
        // If we're at the end and repeat all is on, go back to start
        playTrack(q[0]);
    }
    else {
        // 🚀 QUEUE HAS ENDED: Clear everything out and close the player bar
        stop();                // Stops the howler audio instance and cleans up loops
        queue.set([]);         // Wipes the queue completely clean
        currentTrack.set(null); // Clears out the currently active song metadata
        context.set(null);      // Clears the album/playlist context tracking
        showPlayer.set(false);  // Closes/hides the now playing bar component
        saveState();            // Commits this clean state to localStorage
    }
}

export function playPrev() {
    const q = get(queue);
    const curr = get(currentTrack);

    // Safety check: ensure current track exists
    if (!curr) return;

    const index = curr.queueId
        ? q.findIndex(s => s.queueId === curr.queueId)
        : q.findIndex(s => s.id === curr.id);

    // If we are more than 3 seconds in, just restart the song
    if (sound && sound.seek() > 3) {
        sound.seek(0);
        return;
    }

    if (index > 0) {
        playTrack(q[index - 1]);
    }
}

/**
 * Removes a song from the queue at a specific index
 * @param {number} index
 */
export function removeFromQueue(index) {
    queue.update(q => {
        const newQ = [...q];
        newQ.splice(index, 1);
        return newQ;
    });
}

/**
 * Moves a song in the queue from one index to another
 * @param {number} fromIndex
 * @param {number} toIndex
 */
export function moveInQueue(fromIndex, toIndex) {
    queue.update(q => {
        if (toIndex < 0 || toIndex >= q.length) return q;
        const newQ = [...q];
        const [movedItem] = newQ.splice(fromIndex, 1);
        newQ.splice(toIndex, 0, movedItem);
        return newQ;
    });
}

export function clearQueue() {
    const curr = get(currentTrack);
    if (!curr) {
        queue.set([]);
    } else {
        queue.set([curr]);
    }
}

/**
 * Shuffles the provided songs and plays them
 * @param {any[]} songs 
 */
export function playQueueShuffled(songs) {
    const shuffled = [...songs];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    playQueue(shuffled);
}

/**
 * Shuffles the current queue (except the currently playing song)
 */
export function shuffleCurrentQueue() {
    const q = get(queue);
    const curr = get(currentTrack);

    if (q.length <= 1) return;

    let startIndex = 0;
    let playingTrack = null;

    if (curr) {
        const index = curr.queueId
            ? q.findIndex(s => s.queueId === curr.queueId)
            : q.findIndex(s => s.id === curr.id);
        if (index !== -1) {
            // We only shuffle from index + 1 to end
            const upcoming = q.slice(index + 1);
            // Fisher-Yates shuffle
            for (let i = upcoming.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [upcoming[i], upcoming[j]] = [upcoming[j], upcoming[i]];
            }

            // Reconstruct queue
            const newQ = [...q.slice(0, index + 1), ...upcoming];
            queue.set(newQ);
            return;
        }
    }

    // If not playing or track not found, shuffle whole thing
    const newQ = [...q];
    for (let i = newQ.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newQ[i], newQ[j]] = [newQ[j], newQ[i]];
    }
    queue.set(newQ);
}

function startProgressLoop() {
    clearInterval(progressInterval);
    progressInterval = setInterval(() => {
        if (sound && sound.playing()) {
            // @ts-ignore
            progress.set(sound.seek());

            // Trigger prebuffering if we are at 90% or 10 seconds remaining
            const currentTime = sound.seek();
            const totalDuration = sound.duration();
            const crossfade = get(crossfadeDuration);

            // Handle Crossfade trigger
            if (crossfade > 0 && !isCrossfading && nextSound && totalDuration > 0 && totalDuration - currentTime <= crossfade) {
                startCrossfade();
            } else if (totalDuration > 0 && (currentTime / totalDuration > 0.9 || totalDuration - currentTime < 10)) {
                // Regular prebuffer trigger (if not already crossfading or about to)
                prepareNextTrack();
            }

            // Handle buffering
            // @ts-ignore - _sounds and _node are internal Howler properties
            const audioNode = sound._sounds[0]?._node;
            if (audioNode && audioNode.buffered && audioNode.buffered.length > 0) {
                const totalDuration = sound.duration();
                if (totalDuration > 0) {
                    // Find the buffer range that contains the current playback position
                    const currentTime = sound.seek();
                    let latestBuffered = 0;
                    for (let i = 0; i < audioNode.buffered.length; i++) {
                        if (audioNode.buffered.start(i) <= currentTime && audioNode.buffered.end(i) >= currentTime) {
                            latestBuffered = audioNode.buffered.end(i);
                            break;
                        }
                    }
                    // If we didn't find a range covering current time, just take the last end point as a fallback
                    if (latestBuffered === 0 && audioNode.buffered.length > 0) {
                        latestBuffered = audioNode.buffered.end(audioNode.buffered.length - 1);
                    }
                    buffered.set(latestBuffered / totalDuration);
                }
            }

            // Save state every 5 seconds
            if (Math.floor(get(progress)) % 5 === 0) {
                saveState();
            }
        }
    }, 1000); // Update every second
}

function startCrossfade() {
    if (!nextSound || !nextTrackMetadata) return;

    isCrossfading = true;
    const crossfade = get(crossfadeDuration);

    fadingSound = sound;
    sound = nextSound;
    const currentTrackData = nextTrackMetadata;

    nextSound = null;
    nextTrackMetadata = null;

    // Fade out old
    if (fadingSound) {
        fadingSound.fade(1.0, 0, crossfade * 1000);
        // We don't unload immediately, let it finish the fade
        setTimeout(() => {
            if (fadingSound) {
                fadingSound.unload();
                fadingSound = null;
                isCrossfading = false;
            }
        }, crossfade * 1000 + 500);
    }

    // Fade in new
    currentTrack.set(currentTrackData);
    isFavorite.set(currentTrackData.starred ? true : false);
    setupSoundHandlers(sound, currentTrackData);
    sound.volume(0);
    sound.play();
    sound.fade(0, 1.0, crossfade * 1000);

    updateMediaSession(currentTrackData);
}

/**
 * Polls the server to check if the current track's starred status changed
 * This enables real-time sync when starred/unstarred from other clients
 */
function startStarredCheckLoop() {
    clearInterval(starredCheckInterval);
    starredCheckInterval = setInterval(async () => {
        const curr = get(currentTrack);
        if (!curr) return;

        try {
            const { subsonicFetch } = await import('./subsonic.js');
            const data = await subsonicFetch('getSong', `&id=${curr.id}`);

            if (data && data.song) {
                const serverStarred = !!data.song.starred;
                const localStarred = get(isFavorite);

                // Only update if there's a mismatch
                if (serverStarred !== localStarred) {
                    isFavorite.set(serverStarred);
                    curr.starred = data.song.starred;
                    currentTrack.set(curr); // This will trigger subscribers
                    saveState();
                }
            }
        } catch (error) {
            console.error('Failed to check starred status:', error);
        }
    }, 10000); // Check every 10 seconds
}

export function stop() {
    if (sound) {
        sound.stop();
        sound.unload();
        sound = null;
    }
    isPlaying.set(false);
    progress.set(0);
    if (typeof navigator !== 'undefined' && navigator.mediaSession) {
        navigator.mediaSession.playbackState = 'none';
    }
    clearInterval(progressInterval);
    clearInterval(starredCheckInterval);
}

/**
 * @param {number} seconds
 */
export function seek(seconds) {
    if (sound) {
        sound.seek(seconds);
        progress.set(seconds);
    }
}

/**
 * @param {number} val - 0.0 to 1.0
 */
export function setVolume(val) {
    Howler.volume(val);
    volume.set(val);
}

// REPEAT MODE
export function toggleRepeat() {
    const current = get(repeatMode);
    if (current === 'off') {
        repeatMode.set('all');
    } else if (current === 'all') {
        repeatMode.set('one');
    } else {
        repeatMode.set('off');
    }
}

// FAVORITE
export async function toggleFavorite() {
    const curr = get(currentTrack);

    if (!curr) return;

    // Import the star/unstar functions
    const { starTrack, unstarTrack } = await import('./subsonic.js');

    // Check if the track is currently starred based on the track's starred property
    // starred is a timestamp string when true, undefined when false
    const isCurrentlyStarred = !!curr.starred;

    try {
        if (isCurrentlyStarred) {
            // Unfavorite
            await unstarTrack(curr.id);
            isFavorite.set(false);
            // Update the track object's starred property
            curr.starred = undefined;
        } else {
            // Favorite
            await starTrack(curr.id);
            isFavorite.set(true);
            // Update the track object's starred property
            curr.starred = new Date().toISOString();
        }
        currentTrack.set(curr);
        saveState();
    } catch (error) {
        console.error('Failed to toggle favorite:', error);
    }
}

// QUEUE VISIBILITY
export function toggleQueue() {
    showQueue.update(val => !val);
}

// CLOSE PLAYER
export function closePlayer() {
    stop();
    currentTrack.set(null);
    showPlayer.set(false);
}