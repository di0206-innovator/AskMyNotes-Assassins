const API_KEY = 'AIzaSyDHSlcQKPbzlyoEYfG7B81p7IIu5jWM0bg';
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

async function callGemini(systemPrompt, userPrompt) {
    const response = await fetch(`${BASE_URL}?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [{ parts: [{ text: userPrompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 2000 }
        })
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `API Error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return text;
}

function extractJSON(text) {
    // Try to find JSON block in markdown fences first
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced) {
        return JSON.parse(fenced[1].trim());
    }
    // Otherwise find raw JSON object
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Response format error.');
}

export async function askClaude(_apiKey, subjectName, topChunks, history, question) {
    const systemPrompt = `You are a study assistant. Answer ONLY using the provided notes excerpts. Do not use any outside knowledge. If the notes do not contain enough information, output exactly: NOT_FOUND. Always respond in this exact JSON structure (no markdown fences, just raw JSON): { "answer": "string", "confidence": "High"|"Medium"|"Low", "citations": [ { "fileName": "string", "pageNumber": 0, "chunkIndex": 0, "excerpt": "string" } ], "evidenceSnippets": [ "string" ] }`;

    const chunksText = topChunks.map((c, i) =>
        `${i + 1}. [File: ${c.fileName}, Page: ${c.pageNumber}, Chunk: ${c.chunkIndex}]\nText: ${c.text}`
    ).join('\n\n');

    const historyText = history.map(h =>
        `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`
    ).join('\n\n');

    const userPrompt = `Subject: ${subjectName}\n\nNotes excerpts:\n${chunksText}\n\nConversation history:\n${historyText}\n\nQuestion: ${question}`;

    try {
        const text = await callGemini(systemPrompt, userPrompt);

        if (text.trim() === 'NOT_FOUND') {
            return { answer: 'NOT_FOUND' };
        }

        try {
            return extractJSON(text);
        } catch (e) {
            throw new Error('Response format error.');
        }
    } catch (error) {
        if (error.message === 'Response format error.') throw error;
        if (error.message.includes('API Error')) throw error;
        throw new Error('Connection error. Please retry.');
    }
}

export async function generateStudyMaterials(_apiKey, subjectName, chunks) {
    const systemPrompt = `You are a study question generator. Generate questions ONLY from the provided notes. Respond ONLY in this exact JSON structure (no markdown fences, just raw JSON): { "mcqs": [ { "question": "string", "options": { "A": "string", "B": "string", "C": "string", "D": "string" }, "correctOption": "A"|"B"|"C"|"D", "explanation": "string", "citation": { "fileName": "string", "pageNumber": 0 } } ], "shortAnswer": [ { "question": "string", "modelAnswer": "string", "citation": { "fileName": "string", "pageNumber": 0 } } ] }`;

    const chunksText = chunks.map(c => c.text).join('\n\n');
    const userPrompt = `Subject: ${subjectName}\n\nNotes:\n${chunksText}\n\nGenerate exactly 5 MCQs and exactly 3 short-answer questions.`;

    try {
        const text = await callGemini(systemPrompt, userPrompt);

        try {
            return extractJSON(text);
        } catch (e) {
            throw new Error('Response format error.');
        }
    } catch (error) {
        if (error.message === 'Response format error.') throw error;
        if (error.message.includes('API Error')) throw error;
        throw new Error('Connection error. Please retry.');
    }
}
