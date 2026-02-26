const STOPWORDS = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'for', 'if', 'in', 'into', 'is', 'it',
    'no', 'not', 'of', 'on', 'or', 'such', 'that', 'the', 'their', 'then', 'there', 'these',
    'they', 'this', 'to', 'was', 'will', 'with', 'what', 'who', 'where', 'when', 'why', 'how',
    'can', 'do', 'does', 'did', 'have', 'has', 'had', 'would', 'could', 'should', 'about',
    'please', 'tell', 'me', 'explain'
]);

export function extractKeywords(text) {
    if (!text) return [];
    const words = text.toLowerCase().match(/\b[a-z0-9]+\b/g) || [];
    return words.filter(w => !STOPWORDS.has(w) && w.length > 2);
}

export function retrieveChunks(question, chunks) {
    const keywords = extractKeywords(question);
    if (keywords.length === 0 || chunks.length === 0) {
        return { topChunks: [], insufficientContext: true };
    }

    const scoredChunks = chunks.map(chunk => {
        const chunkTextLower = chunk.text.toLowerCase();
        let score = 0;

        for (const kw of keywords) {
            // create a regex to count word occurrences
            const regex = new RegExp(`\\b${kw}\\b`, 'g');
            const matches = chunkTextLower.match(regex);
            if (matches) {
                score += matches.length;
            }
        }

        return { ...chunk, score };
    });

    const sorted = scoredChunks.sort((a, b) => b.score - a.score);

    // take top 6 chunks, filtering out 0 scores just to be safe
    const topChunks = sorted.filter(c => c.score > 0).slice(0, 6);

    if (topChunks.length === 0) {
        return { topChunks: [], insufficientContext: true };
    }

    return { topChunks, insufficientContext: false };
}
