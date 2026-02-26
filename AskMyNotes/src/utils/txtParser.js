import { chunkText } from './chunking';

export async function parseTxt(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target.result;
                if (!text || !text.trim()) {
                    reject(new Error('Text file is empty.'));
                    return;
                }
                const textChunks = chunkText(text);
                const allChunks = [];
                let globalChunkIndex = 0;
                for (const chunk of textChunks) {
                    allChunks.push({
                        fileName: file.name,
                        pageNumber: 1,
                        chunkIndex: globalChunkIndex++,
                        text: chunk
                    });
                }
                resolve(allChunks);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = () => reject(new Error('Failed to read text file.'));
        reader.readAsText(file);
    });
}
