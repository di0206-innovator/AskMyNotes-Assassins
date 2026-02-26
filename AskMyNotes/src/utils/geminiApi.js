const API_KEY = 'AIzaSyDHSlcQKPbzlyoEYfG7B81p7IIu5jWM0bg';

// Try multiple models in order - if one is rate limited, try the next
const MODELS = [
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash-latest',
];

function getUrl(model) {
    return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function callGemini(systemPrompt, userPrompt) {
    let lastError = null;

    for (const model of MODELS) {
        console.log(`[GeminiAPI] Trying model: ${model}`);

        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                const response = await fetch(getUrl(model), {
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
                    const errData = await response.json().catch(() => ({}));
                    const retryDelay = errData?.error?.details?.find?.(d => d.retryDelay)?.retryDelay;
                    console.warn(`[GeminiAPI] ${model} rate limited (attempt ${attempt + 1}). Retry delay: ${retryDelay || 'unknown'}`);
                    lastError = new Error(`Rate limited on ${model}. Your free tier quota may be exhausted.`);

                    if (attempt === 0 && retryDelay) {
                        const delaySec = parseInt(retryDelay) || 5;
                        if (delaySec <= 10) {
                            console.log(`[GeminiAPI] Waiting ${delaySec}s before retry...`);
                            await sleep(delaySec * 1000);
                            continue;
                        }
                    }
                    break; // Try next model
                }

                if (response.status === 404) {
                    console.warn(`[GeminiAPI] Model ${model} not found, trying next...`);
                    break; // Try next model
                }

                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    const msg = errData?.error?.message || `API Error: ${response.status}`;
                    console.error(`[GeminiAPI] Error from ${model}:`, msg);
                    lastError = new Error(msg);
                    break;
                }

                const data = await response.json();
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                if (!text) {
                    lastError = new Error('Empty response from Gemini.');
                    break;
                }

                console.log(`[GeminiAPI] Success with ${model}`);
                return text;
            } catch (error) {
                console.error(`[GeminiAPI] Fetch error for ${model}:`, error.message);
                lastError = error;
                if (attempt === 0) {
                    await sleep(1000);
                    continue;
                }
                break;
            }
        }
    }

    // If we get here, all models failed
    if (lastError?.message?.includes('Rate limited') || lastError?.message?.includes('quota')) {
        throw new Error('⚠️ Gemini API quota exhausted. The free tier daily limit has been reached. Please wait a few minutes or check your Google AI Studio billing.');
    }
    throw lastError || new Error('Connection error. Please retry.');
}

function extractJSON(text) {
    try {
        return JSON.parse(text.trim());
    } catch (_) {
        const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (fenced) return JSON.parse(fenced[1].trim());
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) return JSON.parse(jsonMatch[0]);
        throw new Error('Response format error.');
    }
}

export async function askGemini(subjectName, topChunks, history, question) {
    const systemPrompt = `You are a study assistant. Answer ONLY using the provided notes excerpts. Do not use outside knowledge. If the notes don't contain enough info, set answer to "NOT_FOUND". Respond in JSON: {"answer":"string","confidence":"High"|"Medium"|"Low","citations":[{"fileName":"string","pageNumber":0,"chunkIndex":0,"excerpt":"string"}],"evidenceSnippets":["string"]}`;

    const chunksText = topChunks.map((c, i) =>
        `[${i + 1}] File: ${c.fileName}, Page: ${c.pageNumber}, Chunk: ${c.chunkIndex}\n${c.text}`
    ).join('\n\n');

    const last6 = (history || []).slice(-6);
    const historyText = last6.length > 0
        ? last6.map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`).join('\n')
        : 'No previous conversation.';

    const userPrompt = `Subject: ${subjectName}\n\nNotes:\n${chunksText}\n\nHistory:\n${historyText}\n\nQuestion: ${question}`;

    const text = await callGemini(systemPrompt, userPrompt);
    const parsed = extractJSON(text);
    if (parsed.answer === 'NOT_FOUND') return { answer: 'NOT_FOUND' };
    return parsed;
}

export async function generateStudyMaterials(subjectName, chunks) {
    const systemPrompt = `Generate study questions from the provided notes. Respond in JSON: {"mcqs":[{"question":"string","options":{"A":"string","B":"string","C":"string","D":"string"},"correctOption":"A"|"B"|"C"|"D","explanation":"string","citation":{"fileName":"string","pageNumber":0}}],"shortAnswer":[{"question":"string","modelAnswer":"string","citation":{"fileName":"string","pageNumber":0}}]}`;

    const chunksText = chunks.map(c => c.text).join('\n\n');
    const userPrompt = `Subject: ${subjectName}\n\nNotes:\n${chunksText}\n\nGenerate 5 MCQs and 3 short-answer questions.`;

    const text = await callGemini(systemPrompt, userPrompt);
    return extractJSON(text);
}
