import { chunkText } from './chunking';

export async function parsePdf(file) {
    const arrayBuffer = await file.arrayBuffer();
    // pdfjsLib is loaded via CDN in index.html
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;
    const allChunks = [];
    let globalChunkIndex = 0;

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const content = await page.getTextContent();
        const pageText = content.items.map(item => 'str' in item ? item.str : '').join(' ');

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
    return allChunks;
}
