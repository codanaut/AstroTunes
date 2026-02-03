/**
 * Parses an artist string into components for display and linking.
 * 
 * @typedef {Object} ArtistPart
 * @property {string} name - The display name of the artist part
 * @property {string|null} id - The ID of the artist (if known/primary)
 * @property {'artist'|'separator'} type - The type of this part
 * 
 * @param {string} artistName - The full artist string (e.g. "Eminem feat. Rihanna")
 * @param {string|null} mainArtistId - The ID of the main artist, if known
 * @param {Array<{id: string, name: string}>} [allArtists] - Optional array of all artist objects from metadata
 * @returns {ArtistPart[]}
 */
export function parseArtistString(artistName, mainArtistId = null, allArtists = []) {
    if (!artistName) return [];

    // Regex to split by common separators, keeping the separators in the result
    // Separators: " feat. ", " ft. ", " with "
    // We REMOVED "&" and "and" to avoid splitting bands like "Hall & Oates"
    // We use capturing groups () to keep the separator in the output array
    const parts = artistName.split(/(\s+(?:feat\.|ft\.|with)\s+)/i);

    /** @type {ArtistPart[]} */
    const result = [];
    let isFirst = true;

    for (const part of parts) {
        // Check if it's a separator
        const lowerPart = part.toLowerCase();
        if (
            lowerPart.match(/^\s+(?:feat\.|ft\.|with)\s+$/)
        ) {
            result.push({
                name: part,
                id: null,
                type: 'separator'
            });
        } else if (part.trim().length > 0) {
            // It's an artist name
            let matchedId = null;

            // 1. Try to find in allArtists metadata
            if (allArtists && allArtists.length > 0) {
                const cleanPart = part.trim().toLowerCase();
                const match = allArtists.find(a => a.name.toLowerCase() === cleanPart);
                if (match) {
                    matchedId = match.id;
                }
            }

            // 2. Fallback to mainArtistId if it's the first one and no match found (or match confirms it)
            if (!matchedId && isFirst) {
                matchedId = mainArtistId;
            }

            result.push({
                name: part,
                id: matchedId,
                type: 'artist'
            });
            isFirst = false;
        }
    }

    return result;
}
