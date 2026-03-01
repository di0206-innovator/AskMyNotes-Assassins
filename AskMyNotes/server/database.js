import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPromise = open({
    filename: path.join(__dirname, 'database.sqlite'),
    driver: sqlite3.Database
});

export async function initDb() {
    const db = await dbPromise;

    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS subjects (
            id TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            colorHex TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS notes_chunks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            subject_id TEXT NOT NULL,
            fileName TEXT NOT NULL,
            pageNumber INTEGER NOT NULL,
            chunkIndex INTEGER NOT NULL,
            text TEXT NOT NULL,
            FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            subject_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            parsed TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE CASCADE
        );
    `);

    console.log('[Database] Initialized correctly.');
    return db;
}

export async function getDb() {
    return dbPromise;
}

// User methods
export async function createUser(name, email, password) {
    const db = await getDb();
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
        const result = await db.run(
            'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
            [name, email, hashedPassword]
        );
        return { id: result.lastID, name, email };
    } catch (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
            throw new Error('Email already exists');
        }
        throw err;
    }
}

export async function getUserByEmail(email) {
    const db = await getDb();
    return db.get('SELECT * FROM users WHERE email = ?', [email]);
}

// Subject methods
export async function createSubject(id, userId, name, colorHex) {
    const db = await getDb();
    await db.run(
        'INSERT INTO subjects (id, user_id, name, colorHex) VALUES (?, ?, ?, ?)',
        [id, userId, name, colorHex]
    );
    return { id, userId, name, colorHex };
}

export async function getSubjectsByUser(userId) {
    const db = await getDb();
    const subjects = await db.all('SELECT * FROM subjects WHERE user_id = ? ORDER BY created_at ASC', [userId]);

    // For each subject, fetch chunks and messages
    for (let sub of subjects) {
        sub.notesChunks = await db.all('SELECT * FROM notes_chunks WHERE subject_id = ? ORDER BY id ASC', [sub.id]);

        const msgs = await db.all('SELECT * FROM messages WHERE subject_id = ? ORDER BY id ASC', [sub.id]);
        sub.conversationHistory = msgs.map(m => ({
            role: m.role,
            content: m.content,
            parsed: m.parsed ? JSON.parse(m.parsed) : undefined
        }));
    }

    return subjects;
}

export async function addNotesChunks(subjectId, chunks) {
    const db = await getDb();
    const stmt = await db.prepare('INSERT INTO notes_chunks (subject_id, fileName, pageNumber, chunkIndex, text) VALUES (?, ?, ?, ?, ?)');
    for (let chunk of chunks) {
        await stmt.run([subjectId, chunk.fileName, chunk.pageNumber || 1, chunk.chunkIndex, chunk.text]);
    }
    await stmt.finalize();
}

export async function addMessage(subjectId, role, content, parsed = null) {
    const db = await getDb();
    const parsedStr = parsed ? JSON.stringify(parsed) : null;
    await db.run(
        'INSERT INTO messages (subject_id, role, content, parsed) VALUES (?, ?, ?, ?)',
        [subjectId, role, content, parsedStr]
    );
}

export async function deleteSubject(subjectId) {
    const db = await getDb();
    await db.run('DELETE FROM subjects WHERE id = ?', [subjectId]);
}
