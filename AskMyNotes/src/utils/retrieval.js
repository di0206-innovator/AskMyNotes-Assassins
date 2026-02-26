const STOPWORDS = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'for', 'if', 'in', 'into', 'is', 'it',
    'no', 'not', 'of', 'on', 'or', 'such', 'that', 'the', 'their', 'then', 'there', 'these',
    'they', 'this', 'to', 'was', 'will', 'with', 'what', 'who', 'where', 'when', 'why', 'how',
    'can', 'do', 'does', 'did', 'have', 'has', 'had', 'would', 'could', 'should', 'about',
    'please', 'tell', 'me', 'explain', 'give', 'show', 'list', 'describe'
]);

export function extractKeywords(text) {
    if (!text) return [];
    const words = text.toLowerCase().match(/\b[a-z0-9]+\b/g) || [];
    return words.filter(w => !STOPWORDS.has(w) && w.length > 1);
}

export function retrieveChunks(question, chunks) {
    if (!chunks || chunks.length === 0) {
        console.warn('[Retrieval] No chunks available');
        return { topChunks: [], insufficientContext: true };
    }

    const keywords = extractKeywords(question);
    console.log('[Retrieval] Keywords extracted:', keywords);
    console.log('[Retrieval] Total chunks available:', chunks.length);

    // Score chunks by keyword matches
    const scoredChunks = chunks.map(chunk => {
        const chunkTextLower = (chunk.text || '').toLowerCase();
        let score = 0;

        for (const kw of keywords) {
            // Use includes for partial matching (more forgiving than word boundary)
            if (chunkTextLower.includes(kw)) {
                score += 2;
            }
            // Also try regex word boundary for exact matches (bonus points)
            try {
                const regex = new RegExp(`\\b${kw}\\b`, 'gi');
                const matches = chunkTextLower.match(regex);
                if (matches) score += matches.length;
            } catch (e) {
                // Ignore regex errors from special chars in keywords
            }
        }

        return { ...chunk, score };
    });

    const sorted = scoredChunks.sort((a, b) => b.score - a.score);
    let topChunks = sorted.filter(c => c.score > 0).slice(0, 6);

    // FALLBACK: If no keyword matches, still send the first 6 chunks
    // so the AI at least has some context to work with
    if (topChunks.length === 0) {
        console.warn('[Retrieval] No keyword matches found, using first 6 chunks as fallback');
        topChunks = chunks.slice(0, 6);
    }

    console.log('[Retrieval] Returning', topChunks.length, 'chunks, top score:', topChunks[0]?.score || 0);
    return { topChunks, insufficientContext: false };
}
