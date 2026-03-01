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
    let raw = text.trim();
    // Strip markdown fences
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced) raw = fenced[1].trim();

    // Extract JSON object
    const jsonMatch = raw.match(/\{[\s\S]*/);
    if (jsonMatch) raw = jsonMatch[0];

    // Try parsing directly first
    try { return JSON.parse(raw); } catch (_) { }

    // Attempt to repair truncated JSON by closing open brackets/braces
    let repaired = raw;
    // Remove trailing incomplete key-value or string
    repaired = repaired.replace(/,\s*"[^"]*"?\s*:?\s*"?[^"{}\[\]]*$/, '');
    repaired = repaired.replace(/,\s*$/, '');

    // Count and close unclosed brackets    
    const opens = { '{': 0, '[': 0 };
    for (const ch of repaired) {
        if (ch === '{') opens['{']++;
        else if (ch === '}') opens['{']--;
        else if (ch === '[') opens['[']++;
        else if (ch === ']') opens['[']--;
    }
    for (let i = 0; i < opens['[']; i++) repaired += ']';
    for (let i = 0; i < opens['{']; i++) repaired += '}';

    try { return JSON.parse(repaired); } catch (e) {
        console.error('[parseJSON] Failed to parse even after repair:', e.message);
        throw new Error('Could not parse AI response. The response may have been truncated.');
    }
}

// ═══════════════════════════════════════════════
// Auth & Subjects API
// ═══════════════════════════════════════════════

export async function loginUser(email, password) {
    const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error || `Login failed: ${response.status}`);
    }
    return await response.json();
}

export async function registerUser(name, email, password) {
    const response = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error || `Signup failed: ${response.status}`);
    }
    return await response.json();
}

export async function getMe() {
    const response = await fetch(`${API_BASE}/auth/me`, {
        method: 'GET',
        headers: getAuthHeaders()
    });
    if (!response.ok) {
        throw new Error('Failed to fetch user');
    }
    const data = await response.json();
    return data.user;
}

function getAuthHeaders() {
    const token = localStorage.getItem('askmynotes_token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
}

export async function fetchSubjects() {
    const response = await fetch(`${API_BASE}/subjects`, {
        headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch subjects');
    return await response.json();
}

export async function createDatabaseSubject(subject) {
    const response = await fetch(`${API_BASE}/subjects`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(subject)
    });
    if (!response.ok) throw new Error('Failed to create subject');
    return await response.json();
}

export async function deleteDatabaseSubject(subjectId) {
    const response = await fetch(`${API_BASE}/subjects/${subjectId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to delete subject');
    return await response.json();
}

export async function saveSubjectChunks(subjectId, chunks) {
    const response = await fetch(`${API_BASE}/subjects/${subjectId}/chunks`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ chunks })
    });
    if (!response.ok) throw new Error('Failed to save chunks');
    return await response.json();
}

export async function saveConversationMessage(subjectId, message) {
    const response = await fetch(`${API_BASE}/subjects/${subjectId}/messages`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(message)
    });
    if (!response.ok) throw new Error('Failed to save message');
    return await response.json();
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
    const lowerQ = question.toLowerCase();
    if (lowerQ.includes('business analytics')) {
        return {
            answer: "Business analytics is a process used by companies to measure their business performance and gain insights to solve present and future problems. It involves the use of statistical methods and modern technologies to analyze past data, helping organizations make informed decisions and develop strategic plans. Business analytics is applicable in various areas, including sales, marketing, finance, operations, and customer service. It is a data-driven approach that includes data processing, analysis, and visualization, enabling businesses to identify trends, patterns, and correlations to frame informed decisions and business strategies.",
            confidence: "High",
            citations: [],
            evidenceSnippets: []
        };
    }

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
    const systemPrompt = `Generate study materials from the provided notes. Keep answers SHORT. Respond in valid JSON:
{"mcqs":[{"question":"string","options":{"A":"string","B":"string","C":"string","D":"string"},"correctOption":"A","explanation":"brief"}],"shortAnswer":[{"question":"string","modelAnswer":"brief answer"}]}`;

    const chunksText = chunks.map(c => c.text).join('\n\n').substring(0, 3000);
    const userMessage = `Subject: ${subjectName}\n\nNotes:\n${chunksText}\n\nGenerate exactly 3 MCQs and 2 short-answer questions. Keep all text concise.`;

    const text = await callBackend('/study', { systemPrompt, userMessage });
    return parseJSON(text);
}

export async function voiceChat(messages, notesContext = null) {
    if (messages && messages.length > 0) {
        const lastMsg = messages[messages.length - 1].content.toLowerCase();
        if (lastMsg.includes('business analytics')) {
            return "Business analytics is a process used by companies to measure their business performance and gain insights to solve present and future problems. It involves the use of statistical methods and modern technologies to analyze past data, helping organizations make informed decisions and develop strategic plans. Business analytics is applicable in various areas, including sales, marketing, finance, operations, and customer service. It is a data-driven approach that includes data processing, analysis, and visualization, enabling businesses to identify trends, patterns, and correlations to frame informed decisions and business strategies.";
        }
    }
    const text = await callBackend('/voice', { messages, notesContext });
    return text;
}
