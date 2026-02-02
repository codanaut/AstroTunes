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
 * Fetches similar artists for a given artist
 * @param {string} id - Artist ID (ID3 tag)
 * @param {number} count
 */
export async function getSimilarArtists(id, count = 20) {
    const data = await subsonicFetch('getArtistInfo2', `&id=${id}&count=${count}`);
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