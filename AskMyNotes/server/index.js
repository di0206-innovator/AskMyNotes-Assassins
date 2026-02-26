import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const app = express();
const PORT = process.env.PORT || 3001;
const API_KEY = process.env.GEMINI_API_KEY;

// Initialize Gemini
const genAI = new GoogleGenerativeAI(API_KEY);
const MODEL_NAME = 'gemini-2.0-flash';

function getModel(options = {}) {
    return genAI.getGenerativeModel({ model: MODEL_NAME, ...options });
}

// Multer for file uploads (in-memory)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
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

// ═══════════════════════════════════════════════
// Helper: Call Gemini with text prompt
// ═══════════════════════════════════════════════
async function callGemini(systemPrompt, userMessage, options = {}) {
    const model = getModel({
        generationConfig: {
            temperature: options.temperature ?? 0.7,
            maxOutputTokens: options.maxTokens ?? 2000,
            ...(options.jsonMode ? { responseMimeType: 'application/json' } : {}),
        },
        ...(systemPrompt ? { systemInstruction: systemPrompt } : {}),
    });

    const result = await model.generateContent(userMessage);
    return result.response.text();
}

// ═══════════════════════════════════════════════
// Helper: Call Gemini with chat history
// ═══════════════════════════════════════════════
async function callGeminiChat(messages, systemPrompt = null, options = {}) {
    const model = getModel({
        generationConfig: {
            temperature: options.temperature ?? 0.7,
            maxOutputTokens: options.maxTokens ?? 800,
            ...(options.jsonMode ? { responseMimeType: 'application/json' } : {}),
        },
        ...(systemPrompt ? { systemInstruction: systemPrompt } : {}),
    });

    // Convert messages to Gemini format
    const history = [];
    for (let i = 0; i < messages.length - 1; i++) {
        const msg = messages[i];
        history.push({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }],
        });
    }

    const chat = model.startChat({ history });
    const lastMessage = messages[messages.length - 1];
    const result = await chat.sendMessage(lastMessage.content);
    return result.response.text();
}

// ═══════════════════════════════════════════════
// Mind Map Endpoint (JSON Graph Extraction)
// ═══════════════════════════════════════════════
app.post('/api/mindmap', async (req, res) => {
    try {
        const { textContext } = req.body;
        if (!textContext) return res.status(400).json({ error: 'Missing text context' });

        const systemPrompt = `You are an expert knowledge extractor. Generate a mind map JSON from the following text.
Extract core concepts as "nodes" and their relationships as "edges".
Respond ONLY with valid JSON in this EXACT format:
{
  "nodes": [
    { "id": "1", "data": { "label": "Main Concept" } },
    { "id": "2", "data": { "label": "Sub Concept" } }
  ],
  "edges": [
    { "id": "e1-2", "source": "1", "target": "2", "label": "relates to" }
  ]
}
Keep the graph concise (max 15 nodes) for high-level overview.`;

        const content = await callGemini(systemPrompt, `TEXT CONTEXT:\n${textContext.substring(0, 15000)}`, {
            temperature: 0.1,
            jsonMode: true,
        });

        const graphData = JSON.parse(content.replace(/^```json/g, '').replace(/```$/g, '').trim());
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

Respond ONLY with valid JSON in this EXACT format:
{
  "mcqs": [
    { "id": "m1", "question": "...", "options": {"A":"...","B":"...","C":"...","D":"..."}, "correctOption": "A" }
  ],
  "essays": [
    { "id": "e1", "question": "..." }
  ]
}`;

        const content = await callGemini(systemPrompt, `NOTES CONTEXT:\n${context.substring(0, 15000)}`, {
            temperature: 0.3,
            jsonMode: true,
        });

        res.json(JSON.parse(content.replace(/^```json/g, '').replace(/```$/g, '').trim()));
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
Respond ONLY with valid JSON in this EXACT format:
{
  "score": 85,
  "feedback": "Your explanation of X was great, but you missed Y...",
  "idealPoints": ["Point 1", "Point 2"]
}`;

        const content = await callGemini(systemPrompt, `NOTES CONTEXT:\n${context.substring(0, 15000)}`, {
            temperature: 0.2,
            jsonMode: true,
        });

        res.json(JSON.parse(content.replace(/^```json/g, '').replace(/```$/g, '').trim()));
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
Use markdown formatting (bullet points, bold text, headers) to organize the information logically. Extract key terms, definitions, and main themes.`;

        const summary = await callGemini(systemPrompt, `TRANSCRIPT:\n${transcript.substring(0, 15000)}`, {
            temperature: 0.3,
        });

        res.json({ summary });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════
// Health check
// ═══════════════════════════════════════════════
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', model: MODEL_NAME, timestamp: new Date().toISOString() });
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

// Function to extract text from an image buffer using Gemini Vision
async function extractTextFromImage(imageBuffer, pageNum) {
    const base64Img = imageBuffer.toString('base64');
    const prompt = `Extract all text, notes, and meaningful content from this page exactly as written. Format with markdown if necessary. If it's a diagram, describe its key points.`;

    const model = getModel({ generationConfig: { temperature: 0.1 } });

    const result = await model.generateContent([
        prompt,
        {
            inlineData: {
                mimeType: 'image/png',
                data: base64Img,
            },
        },
    ]);

    return result.response.text();
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
            // TXT files
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
        res.json({
            fileName: originalname,
            chunks: allChunks,
            totalChunks: allChunks.length,
            totalChars
        });
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
        const text = await callGemini(systemPrompt, userMessage, { jsonMode: true });
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
        const text = await callGemini(systemPrompt, userMessage, { jsonMode: true });
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

        const text = await callGeminiChat(messages, systemMsg, {
            maxTokens: 800,
            jsonMode: false,
        });

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
    console.log(`  📡 Model: ${MODEL_NAME} (Google Gemini)`);
    console.log(`  📄 Upload: POST http://localhost:${PORT}/api/upload`);
    console.log(`  💬 Chat: POST http://localhost:${PORT}/api/chat`);
    console.log(`  🎓 Study: POST http://localhost:${PORT}/api/study`);
    console.log(`  🎙️  Voice: POST http://localhost:${PORT}/api/voice`);
    console.log(`  ✅ Health: http://localhost:${PORT}/api/health\n`);
});
