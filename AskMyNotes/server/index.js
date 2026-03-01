import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { createRequire } from 'module';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { initDb, createUser, getUserByEmail, createSubject, getSubjectsByUser, addNotesChunks, addMessage, deleteSubject } from './database.js';

const require = createRequire(import.meta.url);

const app = express();
const PORT = process.env.PORT || 3001;
const API_KEY = process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY;
const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'openrouter/free';
const JWT_SECRET = process.env.JWT_SECRET || 'askmynotes_super_secret_key_123';

// Initialize Database
await initDb();

// Multer for file uploads (in-memory)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf' || file.originalname.endsWith('.txt')) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF and TXT files are allowed'));
        }
    }
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// ═══════════════════════════════════════════════
// Auth & Database Endpoints
// ═══════════════════════════════════════════════
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const user = await createUser(name, email, password);
        const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
    res.json({ user: req.user });
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await getUserByEmail(email);
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/subjects', authMiddleware, async (req, res) => {
    try {
        const subjects = await getSubjectsByUser(req.user.id);
        res.json(subjects);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/subjects', authMiddleware, async (req, res) => {
    try {
        const { id, name, colorHex } = req.body;
        const subject = await createSubject(id, req.user.id, name, colorHex);
        res.json(subject);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/subjects/:id/chunks', authMiddleware, async (req, res) => {
    try {
        const { chunks } = req.body;
        await addNotesChunks(req.params.id, chunks);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/subjects/:id/messages', authMiddleware, async (req, res) => {
    try {
        const { role, content, parsed } = req.body;
        await addMessage(req.params.id, role, content, parsed);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/subjects/:id', authMiddleware, async (req, res) => {
    try {
        await deleteSubject(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════
// OpenRouter API Helper
// ═══════════════════════════════════════════════
async function callOpenRouter(messages, maxTokens = 1024, jsonMode = true) {
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

// ═══════════════════════════════════════════════
// Mind Map Endpoint
// ═══════════════════════════════════════════════
app.post('/api/mindmap', async (req, res) => {
    try {
        const { textContext } = req.body;
        if (!textContext) return res.status(400).json({ error: 'Missing text context' });

        const systemPrompt = `You are an expert knowledge extractor. Generate a mind map JSON from the following text.
Extract core concepts as "nodes" and their relationships as "edges".
Respond ONLY with valid, unescaped JSON in this EXACT format:
{
  "nodes": [
    { "id": "1", "data": { "label": "Main Concept" } },
    { "id": "2", "data": { "label": "Sub Concept" } }
  ],
  "edges": [
    { "id": "e1-2", "source": "1", "target": "2", "label": "relates to" }
  ]
}
Keep the graph concise (max 15 nodes) for high-level overview.

TEXT CONTEXT:
${textContext.substring(0, 15000)}
`;

        const body = {
            model: MODEL,
            messages: [{ role: 'user', content: systemPrompt }],
            temperature: 0.1,
            response_format: { type: "json_object" }
        };

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'HTTP-Referer': 'https://askmynotes.app',
                'X-Title': 'AskMyNotes Mindmap'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`API error: ${response.status} - ${errBody}`);
        }

        const data = await response.json();
        let content = data.choices[0].message.content;
        content = content.replace(/^```json/g, '').replace(/```$/g, '').trim();
        const graphData = JSON.parse(content);
        res.json(graphData);
    } catch (err) {
        console.error('[Mindmap Error]', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════
// Exam Generation Endpoint
// ═══════════════════════════════════════════════
app.post('/api/exam', async (req, res) => {
    try {
        const { subject, chunks } = req.body;
        if (!chunks || !Array.isArray(chunks)) return res.status(400).json({ error: 'Missing chunks' });

        const context = chunks.map(c => c.text).join('\n\n');
        const systemPrompt = `You are a strict but fair professor creating a mock exam for the subject: ${subject}.
Based ONLY on the provided notes, create an exam consisting of:
1. 3 Multiple Choice Questions (with 4 options and 1 correct answer)
2. 2 Open-Ended Short Essay Questions

Respond ONLY with valid, unescaped JSON in this EXACT format:
{
  "mcqs": [
    { "id": "m1", "question": "...", "options": {"A":"...","B":"...","C":"...","D":"..."}, "correctOption": "A" }
  ],
  "essays": [
    { "id": "e1", "question": "..." }
  ]
}

NOTES CONTEXT:
${context.substring(0, 15000)}
`;

        const body = {
            model: MODEL,
            messages: [{ role: 'user', content: systemPrompt }],
            temperature: 0.3,
            response_format: { type: "json_object" }
        };

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        let content = data.choices[0].message.content;
        content = content.replace(/^```json/g, '').replace(/```$/g, '').trim();
        res.json(JSON.parse(content));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════
// Exam Grading Endpoint
// ═══════════════════════════════════════════════
app.post('/api/grade', async (req, res) => {
    try {
        const { question, studentAnswer, chunks } = req.body;
        if (!question || !studentAnswer) return res.status(400).json({ error: 'Missing answer or question' });

        const context = chunks.map(c => c.text).join('\n\n');
        const systemPrompt = `You are an expert TA grading a student's answer.
QUESTION: ${question}
STUDENT ANSWER: ${studentAnswer}

Based ONLY on the provided notes, grade this answer out of 100. Be critical but fair.
Respond ONLY with valid, unescaped JSON in this EXACT format:
{
  "score": 85,
  "feedback": "Your explanation of X was great, but you missed Y...",
  "idealPoints": ["Point 1", "Point 2"]
}

NOTES CONTEXT:
${context.substring(0, 15000)}
`;

        const body = {
            model: MODEL,
            messages: [{ role: 'user', content: systemPrompt }],
            temperature: 0.2,
            response_format: { type: "json_object" }
        };

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        let content = data.choices[0].message.content;
        content = content.replace(/^```json/g, '').replace(/```$/g, '').trim();
        res.json(JSON.parse(content));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════
// Live Lecture Summarization Endpoint
// ═══════════════════════════════════════════════
app.post('/api/summarize-lecture', async (req, res) => {
    try {
        const { transcript } = req.body;
        if (!transcript) return res.status(400).json({ error: 'Missing transcript' });

        const systemPrompt = `You are an expert academic assistant. Summarize the following live lecture transcript into clear, structured, and easy-to-read study notes.
Use markdown formatting (bullet points, bold text, headers) to organize the information logically. Extract key terms, definitions, and main themes.

TRANSCRIPT:
${transcript.substring(0, 15000)}
`;

        const body = {
            model: MODEL,
            messages: [{ role: 'user', content: systemPrompt }],
            temperature: 0.3
        };

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        const summary = data.choices[0].message.content;
        res.json({ summary });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════
// Health check
// ═══════════════════════════════════════════════
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', model: MODEL, provider: 'OpenRouter', timestamp: new Date().toISOString() });
});

// ═══════════════════════════════════════════════
// PDF/TXT Upload & Parse (Vision OCR)
// ═══════════════════════════════════════════════
const { pdf } = require('pdf-to-img');

function chunkText(text, maxChars = 800) {
    if (!text) return [];
    const sentences = text.match(/[^.!?]+[.!?]+(?:\s+|$)/g) || [text];
    const chunks = [];
    let current = '';

    for (const sentence of sentences) {
        if ((current.length + sentence.length) > maxChars && current.length > 0) {
            chunks.push(current.trim());
            current = '';
        }
        current += sentence;
    }
    if (current.trim()) chunks.push(current.trim());

    const final = [];
    for (const chunk of chunks) {
        if (chunk.length > maxChars) {
            let i = 0;
            while (i < chunk.length) {
                final.push(chunk.substring(i, i + maxChars).trim());
                i += maxChars;
            }
        } else {
            final.push(chunk);
        }
    }
    return final.filter(c => c.length > 0);
}

// Extract text from image using Gemini Vision via OpenRouter
async function extractTextFromImage(imageBuffer, pageNum) {
    const base64Img = imageBuffer.toString('base64');
    const prompt = `Extract all text, notes, and meaningful content from this page exactly as written. Format with markdown if necessary. If it's a diagram, describe its key points.`;

    const body = {
        model: MODEL,
        messages: [{
            role: 'user',
            content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: `data:image/png;base64,${base64Img}` } }
            ]
        }],
        temperature: 0.1,
    };

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`,
            'HTTP-Referer': 'https://askmynotes.app',
            'X-Title': 'AskMyNotes OCR'
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        throw new Error(`Vision API error on page ${pageNum}: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
}

app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const { originalname, mimetype, buffer } = req.file;
        let allChunks = [];
        let globalIndex = 0;
        let totalChars = 0;

        if (mimetype === 'application/pdf' || originalname.endsWith('.pdf')) {
            console.log(`[Upload] Converting ${originalname} to images for OCR...`);
            const document = await pdf(buffer, { scale: 2 });
            let pageNum = 1;

            for await (const imageBuffer of document) {
                console.log(`[Upload] Extracting text from Page ${pageNum}...`);
                try {
                    const pageText = await extractTextFromImage(imageBuffer, pageNum);

                    if (pageText && pageText.trim()) {
                        totalChars += pageText.length;
                        const textChunks = chunkText(pageText);
                        for (const text of textChunks) {
                            allChunks.push({
                                fileName: originalname,
                                pageNumber: pageNum,
                                chunkIndex: globalIndex++,
                                text
                            });
                        }
                    }
                } catch (pageErr) {
                    console.error(`[Upload] Error on page ${pageNum}:`, pageErr.message);
                }
                pageNum++;
            }
        } else {
            const fullText = buffer.toString('utf-8');
            totalChars = fullText.length;
            const textChunks = chunkText(fullText);
            for (const text of textChunks) {
                allChunks.push({ fileName: originalname, pageNumber: 1, chunkIndex: globalIndex++, text });
            }
        }

        if (allChunks.length === 0) {
            return res.status(400).json({ error: 'Failed to extract any text from the file.' });
        }

        console.log(`[Upload] Finished ${originalname}: ${allChunks.length} chunks, ${totalChars} chars`);
        res.json({ fileName: originalname, chunks: allChunks, totalChunks: allChunks.length, totalChars });
    } catch (err) {
        console.error('[Upload Error]', err.message);
        res.status(500).json({ error: `Failed to parse file: ${err.message}` });
    }
});

// ═══════════════════════════════════════════════
// Chat Q&A
// ═══════════════════════════════════════════════
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

// ═══════════════════════════════════════════════
// Study Materials
// ═══════════════════════════════════════════════
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

// ═══════════════════════════════════════════════
// Voice Chat
// ═══════════════════════════════════════════════
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
            false
        );

        res.json({ text });
    } catch (err) {
        console.error('[/api/voice]', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════
// Start Server
// ═══════════════════════════════════════════════
app.listen(PORT, () => {
    console.log(`\n  🚀 AskMyNotes API server running on http://localhost:${PORT}`);
    console.log(`  📡 Model: ${MODEL} (OpenRouter)`);
    console.log(`  📄 Upload: POST http://localhost:${PORT}/api/upload`);
    console.log(`  💬 Chat: POST http://localhost:${PORT}/api/chat`);
    console.log(`  🎓 Study: POST http://localhost:${PORT}/api/study`);
    console.log(`  🎙️  Voice: POST http://localhost:${PORT}/api/voice`);
    console.log(`  ✅ Health: http://localhost:${PORT}/api/health\n`);
});
