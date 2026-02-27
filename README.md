AskMyNotes – Assassins
AskMyNotes is a subject‑scoped, note‑grounded study copilot built as a single‑page React web application. It lets you upload notes for three subjects, ask questions via text or voice, and get cited, voice‑read answers and study questions – all running entirely in the browser with no backend server.
​
​

Core Features
Three fixed subjects with separate notes, chat history, and context.

PDF and TXT upload per subject with client‑side parsing and chunking.

Keyword‑based retrieval over your notes for every question.

Grounded Q&A using an LLM (Claude‑style JSON contract) with strict “Not found in your notes for [Subject]” behavior.
​

Dedicated Study Mode that generates MCQs and short‑answer practice questions with citations.
​

Voice input (ask questions by speaking) and voice output (teacher‑like spoken answers).

Evidence panel that shows exactly which note snippets were used for each answer.

All processing (file parsing, retrieval, prompting, UI) runs client‑side; the only external calls are LLM API requests using text extracted from your notes.
​

Tech Stack and Architecture
Frontend framework: React (single‑page app).

State management: useState and useReducer only; no localStorage / sessionStorage.

Routing/layout: Single page with responsive layout breakpoints (desktop / tablet / mobile).

PDF parsing: pdf.js via CDN for page‑by‑page text extraction.

TXT parsing: Native FileReader API, split into sentence‑aware chunks.

Markdown rendering: marked.js via CDN for assistant answers.

Voice: Web Speech API

SpeechRecognition for voice input.

SpeechSynthesis for spoken answers.

Fonts: Google Fonts – Playfair Display (headings), DM Sans (UI/body), Courier Prime (evidence).

AI backend: Anthropic‑compatible API (Claude JSON contracts) through a browser‑supplied API key.
​

No component libraries are used; styling is implemented with inline styles or a single injected <style> tag as required by the prompt.
​

Layout and Responsiveness
Desktop (≥ 1024px)
Three‑column layout:

Left sidebar (240px): subjects and file management.

Main panel (flex‑1): chat interface.

Right panel (320px): evidence snippets.

CSS Grid + Flexbox for layout.

Smooth transitions on panel open/close (e.g., evidence panel, Study Mode modal).

Tablet (< 1024px)
Evidence panel hidden by default.

Evidence becomes a slide‑up bottom sheet triggered by an “Evidence” button.

Mobile (< 640px)
Single‑column layout.

Subject sidebar hidden; subjects shown as a horizontally scrollable pill row at the top.

Bottom navigation bar with 4 tabs:

Subjects

Chat

Evidence

Study Mode

Chat and input stacked vertically for narrow screens.

Subjects and Notes Management
Subject Slots
Exactly three subject slots rendered in the left sidebar.

Each subject includes:

A colored indicator dot (three distinct accent colors).

Editable subject name:

Click to edit inline.

Save on blur or Enter.

File upload zone:

Accepts .pdf and .txt.

Supports multiple files per subject.

File list:

Shows file names.

Per‑file delete icon.

Active state:

Left border highlight.

Only one subject can be active at a time.

Selecting a subject updates:

Active subject styling.

Loaded chat history (per‑subject).

Notes context used for retrieval and prompting.

All subject data lives purely in React state for the lifetime of the session.
​

File Parsing and Chunking
PDF Files
Parsed client‑side using pdf.js.

Extract text page by page.

For each file, the app builds an array of chunks with:

ts
{
  fileName: string,
  pageNumber: number,
  chunkIndex: number,
  text: string // ≤ 800 characters, split on sentence boundaries
}
While parsing:

Shows a per‑file loading spinner.

When finished:

Shows a green checkmark.

On error:

Shows a red error message per file.

TXT Files
Read via FileReader.

Split into ≤ 800 character chunks on sentence boundaries.

Stored in the subject’s notesChunks alongside PDF chunks.

All parsed chunks are stored under each subject’s state in a notesChunks field, forming the corpus for retrieval and Q&A.
​

Retrieval and Context Building
When the user submits a question:

Lowercase the question.

Tokenize into words.

Remove stopwords.

For each chunk in notesChunks:

Count matches of remaining words.

Use this count as the chunk’s score.

Sort all chunks by score (descending).

Take the top 6 chunks as context.

If every chunk scores 0, set insufficientContext = true.

These top chunks, plus conversation history, are passed into the LLM call as structured context.

Q&A Mode – Claude JSON Contract
For each question, the app builds a messages array with:

System message:

You are a study assistant. Answer ONLY using the provided notes excerpts. Do not use any outside knowledge. If the notes do not contain enough information, output exactly: NOT_FOUND. Always respond in this exact JSON structure:
{ answer: string, confidence: 'High'|'Medium'|'Low', citations: [ { fileName: string, pageNumber: number, chunkIndex: number, excerpt: string } ], evidenceSnippets: [ string ] }

User message:

Contains:

Current subject name.

Numbered list of the top 6 chunks (fileName, pageNumber, chunkIndex, text).

Last 6 turns from conversationHistory as alternating User/Assistant lines.

The current user question.

max_tokens set to 1500.

After the API call:

The app parses the JSON response.

If:

answer === "NOT_FOUND" or

insufficientContext === true
Then the UI shows only:

Not found in your notes for [subjectName]

with:

No confidence badge.

No citations.

No evidence snippets.

No voice output.

Otherwise, it renders the full answer, confidence, citations, and evidence details.

Chat Interface
The main chat panel implements a subject‑scoped conversation UI:

Message list:

Scrollable with auto‑scroll to latest message.

User messages:

Right‑aligned.

Background: subject accent color.

Assistant messages:

Left‑aligned.

Dark card background.

Assistant message content:

Answer text rendered as Markdown (via marked.js).

Confidence badge:

High: green pill.

Medium: amber pill.

Low: red pill.

Citations section:

Each citation rendered as a clickable chip:

fileName — Page pageNumber.

Evidence snippets:

Hidden behind a “Show Evidence” toggle.

Expands inline to show evidenceSnippets from the JSON.

Input bar:

Text input at the bottom.

Send button.

Microphone button (voice input).

Typing indicator:

Animated three‑dot indicator while awaiting the AI response.

Clicking a citation chip syncs with the evidence panel (see below).

Voice Input
The microphone button enables asking questions by speaking:

Uses SpeechRecognition (Web Speech API).

Config:

continuous: false

interimResults: false

UX behavior:

While listening:

Microphone button shows a pulsing red circle.

On successful result:

The recognized transcript is placed into the input.

The question auto‑submits.

On error:

A red toast appears with the error message.

Voice Output
Every successful assistant answer is spoken aloud using SpeechSynthesis:

Markdown is stripped before speaking (plain text only).

Voice config:

lang: 'en-US'

rate: 0.95

pitch: 1.05 (teacher‑like tone).

While speech is playing:

The assistant bubble shows an animated waveform SVG:

Five vertical bars with staggered @keyframes animations.

A Stop button appears to cancel speech.

Speech auto‑stops when:

The user starts a new input / sends a new question.

The “Not found in your notes for [Subject]” message is explicitly not spoken.

Multi‑Turn Memory
The app maintains a per‑subject conversationHistory array in state:

ts
{
  role: 'user' | 'assistant',
  content: string
}
For each completed Q&A turn:

Append:

User question.

Assistant answer.

For every new API call:

Include the last 6 entries from conversationHistory in the user message as alternating lines.

When switching subjects:

The previous subject’s history is preserved in state.

The new subject uses its own conversation history in subsequent calls.

This enables follow‑up questions like “simplify that” or “give an example” while keeping context local to the selected subject.
​

Study Mode
Study Mode turns your notes into practice questions for the selected subject.
​

Trigger and Layout
A “Study Mode” button in the top bar opens a full‑screen modal overlay.

Modal uses a dark academic card with backdrop blur and box shadow.

Prompting
The app sends a Claude API call with:

System message:

You are a study question generator. Generate questions ONLY from the provided notes. Respond ONLY in this exact JSON structure:
{ mcqs: [ { question: string, options: { A: string, B: string, C: string, D: string }, correctOption: 'A'|'B'|'C'|'D', explanation: string, citation: { fileName: string, pageNumber: number } } ], shortAnswer: [ { question: string, modelAnswer: string, citation: { fileName: string, pageNumber: number } } ] }

User message:

Subject name.

Notes: first 20 chunks concatenated.

Explicit instruction: generate exactly 5 MCQs and exactly 3 short‑answer questions.
​

The JSON is parsed and rendered into the Study Mode UI.

Rendering
MCQs:

Flashcard‑style cards.

Front: question and options A–D.

On click:

Card flips using transform: rotateY(...).

Back side shows:

Correct option.

Explanation.

Citation (file + page).

Short‑answer questions:

Rendered as accordion items.

Each item shows:

Question.

On expand: model answer and citation.

Controls:

Loading spinner while generating.

“Regenerate” button to fetch a fresh set of questions from the same notes.

Evidence Panel
The evidence panel (right column on desktop, bottom sheet on smaller screens) keeps answers transparent:

After each successful Q&A response:

Shows the top 6 retrieved chunks.

Each evidence card includes:

File name.

Page number.

Chunk index.

Full chunk text rendered in monospace (Courier Prime).

Query term highlighting:

Words from the user’s question are highlighted in bold within the chunk text.

Citation interactions:

Clicking a citation chip in the chat bubble:

Scrolls the evidence panel to the corresponding chunk card.

Briefly flashes it with a highlight animation (e.g., border or background pulse).

Error Handling and Robustness
All Claude/AI API calls are wrapped in try/catch:

Network error:

Red toast: Connection error. Please retry.

Non‑200 API error:

Red toast with the error message.

JSON parse failure:

Red toast: Response format error.

Toasts auto‑dismiss after ~4 seconds, and the app is designed to never crash, even if an API response is malformed.

Visual Design
The app follows a dark academic aesthetic:

Background: #0D0D0D.

Sidebar: #111111.

Surface cards: #161616.

Text: #E8E4DC (off‑white).

Subject accent colors:

Subject 1: #C8A96E (warm gold).

Subject 2: #6E9EC8 (steel blue).

Subject 3: #9EC87A (sage green).

Design details:

Typography:

Headings: Playfair Display.

Body/UI: DM Sans.

Evidence text: Courier Prime.

Components:

Border radius: 8px on cards.

Subtle borders: 1px solid rgba(255,255,255,0.08).

Modal shadow: 0 4px 24px rgba(0,0,0,0.4).

Motion:

200ms ease transitions on hover/active/focus and panel open/close.

Animated waveform for voice output.

Background texture:

Subtle noise via SVG feTurbulence overlay (no heavy gradients).

Privacy, Constraints, and API Key Flow
All note files (PDF/TXT) remain in the browser:

No uploads to any server.

Only the extracted text used in prompts is sent to the AI API.

On first load:

The app shows a setup screen with a text input for the API key.

The key is stored only in React state.

No persistence to localStorage, sessionStorage, or backend.

This design aligns with the hackathon constraints of a pure client‑side, privacy‑preserving study assistant.
​

Getting Started (Repo‑Level)
Typical usage flow for this repository:

Clone the repo:

bash
git clone https://github.com/di0206-innovator/AskMyNotes-Assassins.git
cd AskMyNotes-Assassins
Install dependencies:

bash
npm install
Run the dev server:

bash
npm run dev   # or npm start, depending on the project setup
Open the app in your browser (usually http://localhost:5173 or http://localhost:3000).

On first load:

Enter your Anthropic‑compatible API key on the setup screen.

Create/rename the three subjects.

Upload PDF/TXT notes.

Start asking questions via text or voice, or open Study Mode to generate practice questions.
