import { chunkText } from './chunking';

export async function parseTxt(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target.result;
                const textChunks = chunkText(text);
                const allChunks = [];
                let globalChunkIndex = 0;
                for (const chunk of textChunks) {
                    allChunks.push({
                        fileName: file.name,
                        pageNumber: 1, // TXT has no pages, fallback to 1
                        chunkIndex: globalChunkIndex++,
                        text: chunk
                    });
                }
                resolve(allChunks);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsText(file);
    });
}
