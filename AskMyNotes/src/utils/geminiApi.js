const API_KEY = 'AIzaSyDHSlcQKPbzlyoEYfG7B81p7IIu5jWM0bg';
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function callGemini(systemPrompt, userPrompt, retries = 3) {
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const response = await fetch(`${BASE_URL}?key=${API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    system_instruction: { parts: [{ text: systemPrompt }] },
                    contents: [{ parts: [{ text: userPrompt }] }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 2000,
                        responseMimeType: 'application/json'
                    }
                })
            });

            if (response.status === 429) {
                console.warn(`Gemini rate limited (attempt ${attempt + 1}/${retries}), retrying...`);
                await sleep(2000 * (attempt + 1));
                continue;
            }

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData?.error?.message || `API Error: ${response.status}`);
            }

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (!text) {
                throw new Error('Empty response from Gemini API.');
            }
            return text;
        } catch (error) {
            if (attempt === retries - 1) throw error;
            if (error.message.includes('API Error') || error.message === 'Empty response from Gemini API.') throw error;
            console.warn(`Gemini call failed (attempt ${attempt + 1}): ${error.message}`);
            await sleep(1000 * (attempt + 1));
        }
    }
    throw new Error('Connection error. Please retry.');
}

function extractJSON(text) {
    try {
        return JSON.parse(text.trim());
    } catch (_) {
        // Fallback: find JSON in markdown fences
        const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (fenced) return JSON.parse(fenced[1].trim());
        // Fallback: find raw JSON object
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) return JSON.parse(jsonMatch[0]);
        throw new Error('Response format error.');
    }
}

export async function askGemini(subjectName, topChunks, history, question) {
    const systemPrompt = `You are a study assistant. Answer ONLY using the provided notes excerpts. Do not use any outside knowledge. If the notes do not contain enough information, set the answer field to exactly "NOT_FOUND". Always respond in this exact JSON structure: { "answer": "string", "confidence": "High" or "Medium" or "Low", "citations": [ { "fileName": "string", "pageNumber": 0, "chunkIndex": 0, "excerpt": "string" } ], "evidenceSnippets": [ "string" ] }`;

    const chunksText = topChunks.map((c, i) =>
        `${i + 1}. [File: ${c.fileName}, Page: ${c.pageNumber}, Chunk: ${c.chunkIndex}]\nText: ${c.text}`
    ).join('\n\n');

    const last6 = (history || []).slice(-6);
    const historyText = last6.map(h =>
        `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`
    ).join('\n\n');

    const userPrompt = `Subject: ${subjectName}\n\nNotes excerpts:\n${chunksText}\n\nConversation history:\n${historyText}\n\nQuestion: ${question}`;

    try {
        const text = await callGemini(systemPrompt, userPrompt);
        const parsed = extractJSON(text);
        if (parsed.answer === 'NOT_FOUND') return { answer: 'NOT_FOUND' };
        return parsed;
    } catch (error) {
        console.error('askGemini error:', error);
        throw error;
    }
}

export async function generateStudyMaterials(subjectName, chunks) {
    const systemPrompt = `You are a study question generator. Generate questions ONLY from the provided notes. Respond in this exact JSON structure: { "mcqs": [ { "question": "string", "options": { "A": "string", "B": "string", "C": "string", "D": "string" }, "correctOption": "A" or "B" or "C" or "D", "explanation": "string", "citation": { "fileName": "string", "pageNumber": 0 } } ], "shortAnswer": [ { "question": "string", "modelAnswer": "string", "citation": { "fileName": "string", "pageNumber": 0 } } ] }`;

    const chunksText = chunks.map(c => c.text).join('\n\n');
    const userPrompt = `Subject: ${subjectName}\n\nNotes:\n${chunksText}\n\nGenerate exactly 5 MCQs and exactly 3 short-answer questions.`;

    try {
        const text = await callGemini(systemPrompt, userPrompt);
        return extractJSON(text);
    } catch (error) {
        console.error('generateStudyMaterials error:', error);
        throw error;
    }
}
