import { chunkText } from './chunking';

export async function parsePdf(file) {
    // Ensure pdf.js is loaded from CDN
    if (!window.pdfjsLib) {
        throw new Error('PDF.js library not loaded. Please refresh the page.');
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;
    const allChunks = [];
    let globalChunkIndex = 0;

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const content = await page.getTextContent();
        const pageText = content.items
            .map(item => (typeof item.str === 'string' ? item.str : ''))
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();

        if (!pageText) continue;

        const textChunks = chunkText(pageText);
        for (const text of textChunks) {
            allChunks.push({
                fileName: file.name,
                pageNumber: pageNum,
                chunkIndex: globalChunkIndex++,
                text
            });
        }
    }

    if (allChunks.length === 0) {
        throw new Error('No text content found in PDF. The file may be image-based.');
    }

    return allChunks;
}
