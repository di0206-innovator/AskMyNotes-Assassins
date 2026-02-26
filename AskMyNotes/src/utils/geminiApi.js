const API_BASE = '/api';

export function getApiUrl(path) {
    // In production, Vite proxies `/api` to the backend if configured,
    // or we use absolute URL if deployed.
    return path;
}

async function callBackend(endpoint, body) {
    console.log(`[API] Calling ${endpoint}`);
    const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error || `Server error: ${response.status}`);
    }

    const data = await response.json();
    if (!data.text) throw new Error('Empty response from server.');
    console.log(`[API] Response received, length: ${data.text.length}`);
    return data.text;
}

function parseJSON(text) {
    try { return JSON.parse(text.trim()); }
    catch (_) {
        const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (fenced) return JSON.parse(fenced[1].trim());
        const json = text.match(/\{[\s\S]*\}/);
        if (json) return JSON.parse(json[0]);
        throw new Error('Could not parse AI response.');
    }
}

export async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error || `Upload failed: ${response.status}`);
    }

    return await response.json();
}

export async function askAI(subjectName, topChunks, history, question, language = 'English') {
    const systemPrompt = `You are a helpful study assistant. Answer ONLY using the provided notes. If the notes don't contain relevant information, set "answer" to "NOT_FOUND". 
IMPORTANT: YOU MUST RESPOND IN THE FOLLOWING LANGUAGE: ${language}.
Respond in valid JSON:
{"answer":"string","confidence":"High"|"Medium"|"Low","citations":[{"fileName":"string","pageNumber":0,"chunkIndex":0,"excerpt":"string"}],"evidenceSnippets":["string"]}`;

    const chunks = topChunks.map((c, i) => `[${i + 1}] ${c.fileName} (p.${c.pageNumber}): ${c.text}`).join('\n\n');
    const hist = (history || []).slice(-6).map(h => `${h.role === 'user' ? 'Student' : 'Assistant'}: ${h.content}`).join('\n');
    const userMessage = `Subject: ${subjectName}\n\n--- NOTES ---\n${chunks}\n\n--- CONVERSATION ---\n${hist || 'None'}\n\n--- QUESTION ---\n${question}`;

    const text = await callBackend('/chat', { systemPrompt, userMessage });
    return parseJSON(text);
}

export async function generateStudyMaterials(subjectName, chunks) {
    const systemPrompt = `Generate study materials from the provided notes. Respond in valid JSON:
{"mcqs":[{"question":"string","options":{"A":"string","B":"string","C":"string","D":"string"},"correctOption":"A"|"B"|"C"|"D","explanation":"string","citation":{"fileName":"string","pageNumber":0}}],"shortAnswer":[{"question":"string","modelAnswer":"string","citation":{"fileName":"string","pageNumber":0}}]}`;

    const chunksText = chunks.map(c => c.text).join('\n\n');
    const userMessage = `Subject: ${subjectName}\n\nNotes:\n${chunksText}\n\nGenerate exactly 5 MCQs and 3 short-answer questions.`;

    const text = await callBackend('/study', { systemPrompt, userMessage });
    return parseJSON(text);
}

export async function voiceChat(messages, notesContext = null) {
    const text = await callBackend('/voice', { messages, notesContext });
    return text;
}
