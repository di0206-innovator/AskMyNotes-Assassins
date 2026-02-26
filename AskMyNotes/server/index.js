import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

const API_KEY = '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';
const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'google/gemini-2.0-flash-001';

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', model: MODEL });
});

// Proxy to OpenRouter
async function callOpenRouter(messages, maxTokens = 2000, jsonMode = true) {
    const body = {
        model: MODEL,
        messages,
        max_tokens: maxTokens,
        temperature: 0.7,
    };
    if (jsonMode) body.response_format = { type: 'json_object' };

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`,
            'HTTP-Referer': 'https://askmynotes.app',
            'X-Title': 'AskMyNotes'
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error?.message || `API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
}

// Chat endpoint - Q&A with notes
app.post('/api/chat', async (req, res) => {
    try {
        const { systemPrompt, userMessage } = req.body;
        if (!systemPrompt || !userMessage) {
            return res.status(400).json({ error: 'systemPrompt and userMessage required' });
        }

        const text = await callOpenRouter([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
        ]);

        res.json({ text });
    } catch (err) {
        console.error('[/api/chat]', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Study materials endpoint
app.post('/api/study', async (req, res) => {
    try {
        const { systemPrompt, userMessage } = req.body;
        if (!systemPrompt || !userMessage) {
            return res.status(400).json({ error: 'systemPrompt and userMessage required' });
        }

        const text = await callOpenRouter([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
        ]);

        res.json({ text });
    } catch (err) {
        console.error('[/api/study]', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Voice chat endpoint - conversational with optional notes context
app.post('/api/voice', async (req, res) => {
    try {
        const { messages, notesContext } = req.body;
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'messages array required' });
        }

        const systemMsg = notesContext
            ? `You are a helpful voice study assistant for AskMyNotes. Answer questions using the student's notes when relevant. Keep responses concise and conversational (1-3 sentences). Avoid markdown.\n\nStudent's notes context:\n${notesContext}`
            : `You are a helpful voice assistant for AskMyNotes. Keep responses concise and conversational (1-3 sentences). Avoid markdown, bullet points, or lists.`;

        const text = await callOpenRouter(
            [{ role: 'system', content: systemMsg }, ...messages],
            800,
            false // no JSON mode for voice - we want natural text
        );

        res.json({ text });
    } catch (err) {
        console.error('[/api/voice]', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`\n  🚀 AskMyNotes API server running on http://localhost:${PORT}`);
    console.log(`  📡 Model: ${MODEL}`);
    console.log(`  ✅ Health check: http://localhost:${PORT}/api/health\n`);
});
