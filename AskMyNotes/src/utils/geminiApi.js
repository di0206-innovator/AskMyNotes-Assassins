const API_KEY = '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';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const BACKEND_URL = 'http://localhost:3001';
const MODEL = 'google/gemini-2.0-flash-001';

// Try backend first, fall back to direct OpenRouter
async function callAI(endpoint, body) {
    // Try backend proxy first
    try {
        console.log(`[API] Trying backend ${endpoint}...`);
        const backendRes = await fetch(`${BACKEND_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (backendRes.ok) {
            const data = await backendRes.json();
            if (data.text) { console.log('[API] Backend responded OK'); return data.text; }
        }
        console.warn('[API] Backend failed, falling back to direct...');
    } catch (_) {
        console.warn('[API] Backend unreachable, using direct API...');
    }

    // Fallback: call OpenRouter directly
    return callOpenRouterDirect(body.systemPrompt, body.userMessage, body.messages, body.notesContext);
}

async function callOpenRouterDirect(systemPrompt, userMessage, messages, notesContext) {
    let msgArray;
    if (messages) {
        // Voice mode
        const sys = notesContext
            ? `You are a helpful voice study assistant. Answer using the student's notes when relevant. Keep responses concise (1-3 sentences). Avoid markdown.\n\nNotes:\n${notesContext}`
            : `You are a helpful voice assistant. Keep responses concise (1-3 sentences). Avoid markdown.`;
        msgArray = [{ role: 'system', content: sys }, ...messages];
    } else {
        msgArray = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
        ];
    }

    const reqBody = {
        model: MODEL,
        messages: msgArray,
        max_tokens: messages ? 800 : 2000,
        temperature: 0.7,
    };
    if (!messages) reqBody.response_format = { type: 'json_object' };

    const response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`,
            'HTTP-Referer': window.location.origin,
            'X-Title': 'AskMyNotes'
        },
        body: JSON.stringify(reqBody)
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error?.message || `API Error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    if (!text) throw new Error('Empty response from AI.');
    console.log('[API] Direct response OK, length:', text.length);
    return text;
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

export async function askAI(subjectName, topChunks, history, question) {
    const systemPrompt = `You are a helpful study assistant. Answer ONLY using the provided notes. If the notes don't contain relevant information, set "answer" to "NOT_FOUND". Respond in valid JSON:
{"answer":"string","confidence":"High"|"Medium"|"Low","citations":[{"fileName":"string","pageNumber":0,"chunkIndex":0,"excerpt":"string"}],"evidenceSnippets":["string"]}`;

    const chunks = topChunks.map((c, i) => `[${i+1}] ${c.fileName} (p.${c.pageNumber}): ${c.text}`).join('\n\n');
    const hist = (history || []).slice(-6).map(h => `${h.role === 'user' ? 'Student' : 'Assistant'}: ${h.content}`).join('\n');
    const userMessage = `Subject: ${subjectName}\n\n--- NOTES ---\n${chunks}\n\n--- CONVERSATION ---\n${hist || 'None'}\n\n--- QUESTION ---\n${question}`;

    const text = await callAI('/api/chat', { systemPrompt, userMessage });
    return parseJSON(text);
}

export async function generateStudyMaterials(subjectName, chunks) {
    const systemPrompt = `Generate study materials from the provided notes. Respond in valid JSON:
{"mcqs":[{"question":"string","options":{"A":"string","B":"string","C":"string","D":"string"},"correctOption":"A"|"B"|"C"|"D","explanation":"string","citation":{"fileName":"string","pageNumber":0}}],"shortAnswer":[{"question":"string","modelAnswer":"string","citation":{"fileName":"string","pageNumber":0}}]}`;

    const chunksText = chunks.map(c => c.text).join('\n\n');
    const userMessage = `Subject: ${subjectName}\n\nNotes:\n${chunksText}\n\nGenerate exactly 5 MCQs and 3 short-answer questions.`;

    const text = await callAI('/api/study', { systemPrompt, userMessage });
    return parseJSON(text);
}

export async function voiceChat(messages, notesContext = null) {
    return await callAI('/api/voice', { messages, notesContext });
}
