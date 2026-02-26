import { chunkText } from './chunking';
import { uploadFile } from './geminiApi';

export async function parsePdf(file) {
    // Strategy 1: Client-side with pdf.js CDN (Instant, text-based PDFs)
    try {
        if (!window.pdfjsLib) {
            throw new Error('PDF.js library not loaded.');
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

        if (allChunks.length > 0) {
            console.log(`[PDF] Client parsed ${file.name}: ${allChunks.length} chunks`);
            return allChunks;
        } else {
            console.log(`[PDF] Client parsed 0 chunks (likely scanned image). Falling back to server OCR.`);
        }
    } catch (clientErr) {
        console.warn(`[PDF] Client parsing failed, falling back to server:`, clientErr.message);
    }

    // Strategy 2: Server-side parsing with Vision OCR (Slow, scanned-image PDFs)
    console.log(`[PDF] Uploading ${file.name} to server for OCR parsing...`);
    const result = await uploadFile(file);
    if (result.chunks && result.chunks.length > 0) {
        console.log(`[PDF] Server parsed ${file.name}: ${result.chunks.length} chunks`);
        return result.chunks;
    }

    throw new Error('Failed to extract any text from the PDF on both client and server.');
}
