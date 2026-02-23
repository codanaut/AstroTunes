// @ts-ignore - Ignores missing type definitions for blueimp-md5
import md5 from 'blueimp-md5';
import { get } from 'svelte/store';
import { auth } from './auth';

/**
 * Generates the auth query parameters required by Subsonic
 */
function getAuthParams() {
    const { username, password } = get(auth);
    if (!username || !password) return '';

    const salt = Math.random().toString(36).substring(2, 15);
    const token = md5(password + salt);
    return `u=${username}&t=${token}&s=${salt}&v=1.16.1&c=${'AstroTunes'}&f=json`;
}

/**
 * Fetches data from Subsonic
 * @param {string} endpoint - e.g., 'getAlbumList'
 * @param {string} params - e.g., '&type=random'
 */
export async function subsonicFetch(endpoint, params = '') {
    const { serverUrl, username, password } = get(auth);

    if (!serverUrl || !username || !password) {
        console.warn("Subsonic: Missing credentials");
        return null;
    }

    const query = getAuthParams();
    const cleanUrl = serverUrl.replace(/\/$/, '');
    const url = `${cleanUrl}/rest/${endpoint}.view?${query}${params}`;

    try {
        const res = await fetch(url);
        const data = await res.json();

        if (data['subsonic-response'] && data['subsonic-response'].status === 'failed') {
            console.error("Subsonic API Error:", data['subsonic-response'].error);
            return null;
        }

        return data['subsonic-response'];
    } catch (e) {
        console.error("Subsonic Fetch Error:", e);
        return null;
    }
}

/**
 * Generates a stream URL for a song ID
 * @param {string} id 
 */
export function getStreamUrl(id) {
    const { serverUrl } = get(auth);
    if (!serverUrl) return '';
    const cleanUrl = serverUrl.replace(/\/$/, '');
    return `${cleanUrl}/rest/stream.view?${getAuthParams()}&id=${id}`;
}

/**
 * Generates an image URL for cover art
 * @param {string} id 
 */
export function getCoverArtUrl(id, size = 300) {
    const { serverUrl } = get(auth);
    if (!serverUrl) return '';
    const cleanUrl = serverUrl.replace(/\/$/, '');
    let url = `${cleanUrl}/rest/getCoverArt.view?${getAuthParams()}&id=${id}`;
    if (size) {
        url += `&size=${size}`;
    }
    return url;
}

/**
 * Stars (favorites) a track
 * @param {string} id - Track ID
 */
export async function starTrack(id) {
    return await subsonicFetch('star', `&id=${id}`);
}

/**
 * Unstars (unfavorites) a track
 * @param {string} id - Track ID
 */
export async function unstarTrack(id) {
    return await subsonicFetch('unstar', `&id=${id}`);
}

/**
 * Stars (favorites) an album
 * @param {string} id - Album ID
 */
export async function starAlbum(id) {
    return await subsonicFetch('star', `&id=${id}`);
}

/**
 * Unstars (unfavorites) an album
 * @param {string} id - Album ID
 */
export async function unstarAlbum(id) {
    return await subsonicFetch('unstar', `&id=${id}`);
}

/**
 * Searches for songs
 * @param {string} query - Search query
 * @param {number} offset - Offset for pagination
 * @param {number} count - Number of results to return
 */
export async function searchSongs(query = '', offset = 0, count = 50) {
    return await subsonicFetch('search3', `&query=${encodeURIComponent(query)}&songOffset=${offset}&songCount=${count}&artistCount=0&albumCount=0`);
}

/**
 * Fetches a list of albums
 * @param {number} offset 
 * @param {number} count 
 */
export async function getAlbums(offset = 0, count = 50, type = 'alphabeticalByName') {
    return await subsonicFetch('getAlbumList', `&type=${type}&size=${count}&offset=${offset}`);
}

/**
 * Searches for artists
 * @param {string} query 
 * @param {number} offset 
 * @param {number} count 
 */
export async function searchArtists(query = '', offset = 0, count = 50) {
    return await subsonicFetch('search3', `&query=${encodeURIComponent(query)}&artistOffset=${offset}&artistCount=${count}&songCount=0&albumCount=0`);
}

/**
 * Searches for artists, albums, and songs
 * @param {string} query 
 * @param {number} offset 
 * @param {number} count 
 */
export async function search(query = '', offset = 0, count = 20) {
    return await subsonicFetch('search3', `&query=${encodeURIComponent(query)}&songCount=${count}&songOffset=${offset}&artistCount=${count}&artistOffset=${offset}&albumCount=${count}&albumOffset=${offset}`);
}

/**
 * Fetches all artists (uses getArtists ID3 endpoint)
 * Returns artists already sorted alphabetically
 */
export async function getAllArtists() {
    return await subsonicFetch('getArtists');
}

/**
 * Scrobbles a track (registers playback)
 * @param {string} id - Track ID
 * @param {boolean} submission - If true, registers as played. If false, registers as "now playing"
 */
export async function scrobble(id, submission = true) {
    return await subsonicFetch('scrobble', `&id=${id}&submission=${submission}`);
}

/**
 * Fetches the total number of albums
 */
export async function getAlbumCount() {
    const data = await subsonicFetch('search3', '&query=&albumCount=100000&songCount=0&artistCount=0');
    return data?.searchResult3?.album?.length || 0;
}

/**
 * Fetches top songs for an artist
 * @param {string} artistName
 * @param {number} count
 */
export async function getTopSongs(artistName, count = 50) {
    return await subsonicFetch('getTopSongs', `&artist=${encodeURIComponent(artistName)}&count=${count}`);
}

/**
 * Fetches additional info for an artist (biography, images, similar artists)
 * @param {string} id - Artist ID
 * @param {number} count - Number of similar artists to return
 */
export async function getArtistInfo(id, count = 20) {
    return await subsonicFetch('getArtistInfo2', `&id=${id}&count=${count}`);
}

/**
 * Fetches similar artists for a given artist
 * @param {string} id - Artist ID (ID3 tag)
 * @param {number} count
 */
export async function getSimilarArtists(id, count = 20) {
    const data = await getArtistInfo(id, count);
    return data?.artistInfo2?.similarArtist || [];
}

/**
 * Fetches all playlists
 */
export async function getPlaylists() {
    return await subsonicFetch('getPlaylists');
}

/**
 * Fetches a specific playlist
 * @param {string} id 
 */
export async function getPlaylist(id) {
    return await subsonicFetch('getPlaylist', `&id=${id}`);
}

/**
 * Creates a new playlist
 * @param {string} name 
 * @param {string[]} songIds 
 */
export async function createPlaylist(name, songIds = []) {
    let params = `&name=${encodeURIComponent(name)}`;
    songIds.forEach(id => {
        params += `&songId=${id}`;
    });
    return await subsonicFetch('createPlaylist', params);
}

/**
 * Updates a playlist (add/remove songs)
 * @param {string} playlistId 
 * @param {object} options
 * @param {string[]} [options.songIdsToAdd]
 * @param {number[]} [options.songIndexesToRemove]
 * @param {string} [options.name]
 * @param {string} [options.comment]
 * @param {boolean} [options.public]
 */
export async function updatePlaylist(playlistId, { songIdsToAdd = [], songIndexesToRemove = [], name, comment, public: isPublic } = {}) {
    let params = `&playlistId=${playlistId}`;
    if (name) params += `&name=${encodeURIComponent(name)}`;
    if (comment) params += `&comment=${encodeURIComponent(comment)}`;
    if (isPublic !== undefined) params += `&public=${isPublic}`;

    songIdsToAdd.forEach(id => {
        params += `&songIdToAdd=${id}`;
    });

    songIndexesToRemove.forEach(index => {
        params += `&songIndexToRemove=${index}`;
    });

    return await subsonicFetch('updatePlaylist', params);
}

/**
 * Deletes a playlist
 * @param {string} id 
 */
export async function deletePlaylist(id) {
    return await subsonicFetch('deletePlaylist', `&id=${id}`);
}

/**
 * Reorders a playlist by replacing its content
 * @param {string} playlistId
 * @param {string[]} newSongIds - Array of song IDs in the new order
 */
export async function reorderPlaylist(playlistId, newSongIds) {
    // 1. Get current playlist to find songs to remove (all of them)
    const current = await getPlaylist(playlistId);
    if (!current?.playlist?.entry) return;

    const songs = current.playlist.entry;
    const indexesToRemove = songs.map((s, i) => i);

    // 2. Clear playlist
    // We can't do this in one go reliably with just updatePlaylist for reordering, 
    // but we can try to remove all and add new.
    // Subsonic updatePlaylist allows removing and adding in same call.
    // However, the order of operations matters. Usually it removes then adds.
    // Let's try to construct the params.

    // Note: This approach (Remove All + Add All) is destructive if it fails halfway. 
    // A safer way might be creating a new playlist and swapping, but that changes ID.
    // Let's rely on updatePlaylist.

    // It's safer to just iterate and build the big request.
    let params = `&playlistId=${playlistId}`;
    indexesToRemove.forEach(index => {
        params += `&songIndexToRemove=${index}`;
    });
    newSongIds.forEach(id => {
        params += `&songIdToAdd=${id}`;
    });

    return await subsonicFetch('updatePlaylist', params);
}
