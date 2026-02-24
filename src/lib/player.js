import { writable, get } from 'svelte/store';
// @ts-ignore - Ignores missing type definitions for howler
import { Howl } from 'howler';
import { getStreamUrl } from './subsonic.js';

// STATE
export const isPlaying = writable(false);
/** @type {import('svelte/store').Writable<any>} */
export const currentTrack = writable(null); // The song object
/** @type {import('svelte/store').Writable<any[]>} */
export const queue = writable([]); // Array of songs
export const progress = writable(0); // Current time in seconds
export const buffered = writable(0); // Buffered time as percentage (0 to 1)
export const duration = writable(0); // Total time in seconds
export const repeatMode = writable('off'); // 'off', 'all', 'one'
export const isFavorite = writable(false); // Whether current track is favorited
export const showQueue = writable(false); // Whether queue panel is visible
export const showPlayer = writable(true); // Whether player bar is visible
/** @type {import('svelte/store').Writable<{type: string|null, id: string|null, name: string|null} | null>} */
export const context = writable(null); // Context of current playback

/** @type {Howl | null} */
let sound = null;
/** @type {any} */
let progressInterval = null;
/** @type {any} */
let starredCheckInterval = null;

// FUNCTIONS

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

    // 1. Cleanup old audio
    if (sound) {
        sound.unload();
        clearInterval(progressInterval);
        clearInterval(starredCheckInterval);
    }

    // 2. Update State
    currentTrack.set(track);
    isPlaying.set(true);

    // Set favorite state based on track's starred property
    isFavorite.set(track.starred ? true : false);

    // 3. Init Howler
    sound = new Howl({
        src: [getStreamUrl(track.id)],
        html5: true, // Forces HTML5 Audio (better for large streams)
        format: ['mp3', 'flac'],
        volume: get(volume),
        onplay: () => {
            duration.set(sound ? sound.duration() : 0);
            startProgressLoop();
            startStarredCheckLoop();
            // Register "Now Playing"
            import('./subsonic.js').then(({ scrobble }) => {
                scrobble(track.id, false).catch(e => console.error("Failed to set Now Playing:", e));
            });
        },
        onend: () => {
            // Scrobble the song (submission=true is default)
            import('./subsonic.js').then(({ scrobble }) => {
                scrobble(track.id, true).catch(e => console.error("Failed to scrobble:", e));
            });

            const repeat = get(repeatMode);
            if (repeat === 'one') {
                sound?.seek(0);
                sound?.play();
            } else {
                playNext();
            }
        }
    });

    sound.play();
}

export function togglePlay() {
    if (sound) {
        if (sound.playing()) {
            sound.pause();
            isPlaying.set(false);
        } else {
            sound.play();
            isPlaying.set(true);
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
        }
    }, 1000); // Update every second
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

export const volume = writable(1.0); // 0.0 to 1.0

/**
 * @param {number} val - 0.0 to 1.0
 */
export function setVolume(val) {
    if (sound) {
        sound.volume(val);
    }
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