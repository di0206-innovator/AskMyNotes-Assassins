export function chunkText(text, maxChars = 800) {
    if (!text) return [];
    // Split text into sentences using basic punctuation + space boundary
    const sentences = text.match(/[^.!?]+[.!?]+(?:\s+|$)/g) || [text];
    const chunks = [];
    let currentChunk = '';

    for (const sentence of sentences) {
        if ((currentChunk.length + sentence.length) > maxChars && currentChunk.length > 0) {
            chunks.push(currentChunk.trim());
            currentChunk = '';
        }
        currentChunk += sentence;
    }
    if (currentChunk.trim().length > 0) {
        chunks.push(currentChunk.trim());
    }

    // Handle case where a single sentence is > maxChars
    const finalChunks = [];
    for (const chunk of chunks) {
        if (chunk.length > maxChars) {
            // Hard split into maxChars-char blocks
            let i = 0;
            while (i < chunk.length) {
                finalChunks.push(chunk.substring(i, i + maxChars));
                i += maxChars;
            }
        } else {
            finalChunks.push(chunk);
        }
    }

    return finalChunks.filter(c => c.trim().length > 0).map(c => c.trim());
}
