const API_KEY = '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';
const BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'google/gemini-2.0-flash-001';

async function callAI(systemPrompt, userMessage) {
    console.log('[AI] Calling OpenRouter with model:', MODEL);

    const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`,
            'HTTP-Referer': window.location.origin,
            'X-Title': 'AskMyNotes'
        },
        body: JSON.stringify({
            model: MODEL,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage }
            ],
            max_tokens: 2000,
            temperature: 0.7,
            response_format: { type: 'json_object' }
        })
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const msg = errData?.error?.message || `API Error: ${response.status}`;
        console.error('[AI] Error:', msg);
        throw new Error(msg);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    if (!text) throw new Error('Empty response from AI.');
    console.log('[AI] Response received, length:', text.length);
    return text;
}

function parseJSON(text) {
    try {
        return JSON.parse(text.trim());
    } catch (_) {
        const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (fenced) return JSON.parse(fenced[1].trim());
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) return JSON.parse(jsonMatch[0]);
        throw new Error('Could not parse AI response.');
    }
}

export async function askAI(subjectName, topChunks, history, question) {
    const systemPrompt = `You are a helpful study assistant. Answer ONLY using the provided notes. If the notes don't contain relevant information, set "answer" to "NOT_FOUND". Respond in valid JSON with this structure:
{"answer":"your detailed answer","confidence":"High"|"Medium"|"Low","citations":[{"fileName":"string","pageNumber":0,"chunkIndex":0,"excerpt":"relevant quote"}],"evidenceSnippets":["key supporting text"]}`;

    const chunks = topChunks.map((c, i) =>
        `[${i + 1}] ${c.fileName} (p.${c.pageNumber}): ${c.text}`
    ).join('\n\n');

    const hist = (history || []).slice(-6)
        .map(h => `${h.role === 'user' ? 'Student' : 'Assistant'}: ${h.content}`)
        .join('\n');

    const userMsg = `Subject: ${subjectName}\n\n--- NOTES ---\n${chunks}\n\n--- CONVERSATION ---\n${hist || 'None'}\n\n--- QUESTION ---\n${question}`;

    const text = await callAI(systemPrompt, userMsg);
    const parsed = parseJSON(text);
    return parsed;
}

export async function generateStudyMaterials(subjectName, chunks) {
    const systemPrompt = `Generate study materials from the provided notes. Respond in valid JSON:
{"mcqs":[{"question":"string","options":{"A":"string","B":"string","C":"string","D":"string"},"correctOption":"A"|"B"|"C"|"D","explanation":"string","citation":{"fileName":"string","pageNumber":0}}],"shortAnswer":[{"question":"string","modelAnswer":"string","citation":{"fileName":"string","pageNumber":0}}]}`;

    const chunksText = chunks.map(c => c.text).join('\n\n');
    const userMsg = `Subject: ${subjectName}\n\nNotes:\n${chunksText}\n\nGenerate exactly 5 MCQs and 3 short-answer questions.`;

    const text = await callAI(systemPrompt, userMsg);
    return parseJSON(text);
}
