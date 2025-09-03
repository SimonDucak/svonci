import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class Database {
    constructor() {
        this.db = null;
    }

    async init() {
        try {
            // Open database connection
            this.db = await open({
                filename: join(__dirname, 'database.sqlite'),
                driver: sqlite3.Database
            });

            console.log('📂 Connected to SQLite database');

            // Create tables if they don't exist
            await this.createTables();

            return this.db;
        } catch (error) {
            console.error('Database initialization error:', error);
            throw error;
        }
    }

    async createTables() {
        try {
            // Games table
            await this.db.exec(`
        CREATE TABLE IF NOT EXISTS games (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          source_locale TEXT NOT NULL,
          target_locale TEXT NOT NULL,
          translations TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

            // Game sessions table (for tracking play statistics)
            await this.db.exec(`
        CREATE TABLE IF NOT EXISTS game_sessions (
          id TEXT PRIMARY KEY,
          game_id TEXT NOT NULL,
          completed_at DATETIME,
          time_seconds INTEGER,
          score INTEGER,
          FOREIGN KEY (game_id) REFERENCES games (id) ON DELETE CASCADE
        )
      `);

            // Generated vocabulary cache table
            await this.db.exec(`
        CREATE TABLE IF NOT EXISTS vocabulary_cache (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          theme TEXT,
          source_locale TEXT NOT NULL,
          target_locale TEXT NOT NULL,
          word_count INTEGER,
          translations TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

            // Conversations table
            await this.db.exec(`
        CREATE TABLE IF NOT EXISTS conversations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          game_id TEXT,
          theme TEXT NOT NULL,
          language TEXT NOT NULL,
          vocabulary TEXT NOT NULL,
          conversation TEXT NOT NULL,
          raw_response TEXT,
          status TEXT DEFAULT 'success',
          error_message TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (game_id) REFERENCES games (id) ON DELETE CASCADE
        )
      `);

            // Create indexes for better query performance
            await this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_conversations_game_id ON conversations(game_id);
        CREATE INDEX IF NOT EXISTS idx_conversations_theme ON conversations(theme);
        CREATE INDEX IF NOT EXISTS idx_conversations_language ON conversations(language);
        CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);
      `);

            console.log('✅ Database tables ready');
        } catch (error) {
            console.error('Error creating tables:', error);
            throw error;
        }
    }

    // Game CRUD operations
    async createGame(game) {
        const { id, name, sourceLocale, targetLocale, translations } = game;
        const query = `
      INSERT INTO games (id, name, source_locale, target_locale, translations)
      VALUES (?, ?, ?, ?, ?)
    `;

        return await this.db.run(
            query,
            [id, name, sourceLocale, targetLocale, JSON.stringify(translations)]
        );
    }

    async getGame(id) {
        const query = `SELECT * FROM games WHERE id = ?`;
        const game = await this.db.get(query, [id]);

        if (game) {
            game.translations = JSON.parse(game.translations);
        }

        return game;
    }

    async getGames(page = 1, limit = 10, search = '') {
        const offset = (page - 1) * limit;
        let query = `
      SELECT id, name, source_locale, target_locale, translations, created_at, updated_at 
      FROM games
    `;
        let countQuery = `SELECT COUNT(*) as total FROM games`;
        const params = [];
        const countParams = [];

        if (search) {
            query += ` WHERE name LIKE ?`;
            countQuery += ` WHERE name LIKE ?`;
            params.push(`%${search}%`);
            countParams.push(`%${search}%`);
        }

        query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        const games = await this.db.all(query, params);
        const { total } = await this.db.get(countQuery, countParams);

        return {
            games,
            total,
            totalPages: Math.ceil(total / limit)
        };
    }

    async updateGame(id, game) {
        const { name, sourceLocale, targetLocale, translations } = game;
        const query = `
      UPDATE games 
      SET name = ?, source_locale = ?, target_locale = ?, translations = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

        return await this.db.run(
            query,
            [name, sourceLocale, targetLocale, JSON.stringify(translations), id]
        );
    }

    async deleteGame(id) {
        const query = `DELETE FROM games WHERE id = ?`;
        return await this.db.run(query, [id]);
    }

    // Vocabulary cache operations
    async getCachedVocabulary(theme, sourceLocale, targetLocale, wordCount) {
        const query = `
      SELECT * FROM vocabulary_cache 
      WHERE theme = ? AND source_locale = ? AND target_locale = ? AND word_count = ?
      ORDER BY created_at DESC
      LIMIT 1
    `;

        const cached = await this.db.get(query, [theme, sourceLocale, targetLocale, wordCount]);

        if (cached) {
            cached.translations = JSON.parse(cached.translations);
        }

        return cached;
    }

    async cacheVocabulary(theme, sourceLocale, targetLocale, wordCount, translations) {
        const query = `
      INSERT INTO vocabulary_cache (theme, source_locale, target_locale, word_count, translations)
      VALUES (?, ?, ?, ?, ?)
    `;

        return await this.db.run(
            query,
            [theme, sourceLocale, targetLocale, wordCount, JSON.stringify(translations)]
        );
    }

    // Conversation CRUD operations
    async createConversation(conversationData) {
        const {
            gameId = null,
            theme,
            language,
            vocabulary,
            conversation,
            rawResponse = null,
            status = 'success',
            errorMessage = null
        } = conversationData;

        const query = `
      INSERT INTO conversations (game_id, theme, language, vocabulary, conversation, raw_response, status, error_message)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

        const result = await this.db.run(
            query,
            [
                gameId,
                theme,
                language,
                JSON.stringify(vocabulary),
                JSON.stringify(conversation),
                rawResponse,
                status,
                errorMessage
            ]
        );

        return { id: result.lastID, ...conversationData };
    }

    async getConversation(id) {
        const query = `SELECT * FROM conversations WHERE id = ?`;
        const conversation = await this.db.get(query, [id]);

        if (conversation) {
            conversation.vocabulary = JSON.parse(conversation.vocabulary);
            conversation.conversation = JSON.parse(conversation.conversation);
        }

        return conversation;
    }

    async getConversations(options = {}) {
        const {
            gameId = null,
            theme = null,
            language = null,
            page = 1,
            limit = 10,
            orderBy = 'created_at',
            order = 'DESC'
        } = options;

        const offset = (page - 1) * limit;
        let query = `SELECT * FROM conversations WHERE 1=1`;
        let countQuery = `SELECT COUNT(*) as total FROM conversations WHERE 1=1`;
        const params = [];
        const countParams = [];

        // Add filters
        if (gameId) {
            query += ` AND game_id = ?`;
            countQuery += ` AND game_id = ?`;
            params.push(gameId);
            countParams.push(gameId);
        }

        if (theme) {
            query += ` AND theme LIKE ?`;
            countQuery += ` AND theme LIKE ?`;
            params.push(`%${theme}%`);
            countParams.push(`%${theme}%`);
        }

        if (language) {
            query += ` AND language = ?`;
            countQuery += ` AND language = ?`;
            params.push(language);
            countParams.push(language);
        }

        // Add ordering and pagination
        query += ` ORDER BY ${orderBy} ${order} LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        const conversations = await this.db.all(query, params);
        const { total } = await this.db.get(countQuery, countParams);

        // Parse JSON fields
        conversations.forEach(conv => {
            conv.vocabulary = JSON.parse(conv.vocabulary);
            conv.conversation = JSON.parse(conv.conversation);
        });

        return {
            conversations,
            total,
            totalPages: Math.ceil(total / limit),
            page,
            limit
        };
    }

    async getConversationsByGameId(gameId, options = {}) {
        return this.getConversations({ ...options, gameId });
    }

    async updateConversation(id, conversationData) {
        const fields = [];
        const values = [];

        // Dynamically build update query based on provided fields
        if (conversationData.gameId !== undefined) {
            fields.push('game_id = ?');
            values.push(conversationData.gameId);
        }
        if (conversationData.theme) {
            fields.push('theme = ?');
            values.push(conversationData.theme);
        }
        if (conversationData.language) {
            fields.push('language = ?');
            values.push(conversationData.language);
        }
        if (conversationData.vocabulary) {
            fields.push('vocabulary = ?');
            values.push(JSON.stringify(conversationData.vocabulary));
        }
        if (conversationData.conversation) {
            fields.push('conversation = ?');
            values.push(JSON.stringify(conversationData.conversation));
        }
        if (conversationData.rawResponse !== undefined) {
            fields.push('raw_response = ?');
            values.push(conversationData.rawResponse);
        }
        if (conversationData.status) {
            fields.push('status = ?');
            values.push(conversationData.status);
        }
        if (conversationData.errorMessage !== undefined) {
            fields.push('error_message = ?');
            values.push(conversationData.errorMessage);
        }

        fields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);

        const query = `UPDATE conversations SET ${fields.join(', ')} WHERE id = ?`;
        return await this.db.run(query, values);
    }

    async deleteConversation(id) {
        const query = `DELETE FROM conversations WHERE id = ?`;
        return await this.db.run(query, [id]);
    }

    async deleteConversationsByGameId(gameId) {
        const query = `DELETE FROM conversations WHERE game_id = ?`;
        return await this.db.run(query, [gameId]);
    }

    // Statistics and analytics
    async getConversationStats(gameId = null) {
        let query = `
      SELECT 
        COUNT(*) as total_conversations,
        COUNT(DISTINCT theme) as unique_themes,
        COUNT(DISTINCT language) as unique_languages,
        COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_conversations,
        COUNT(CASE WHEN status = 'error' THEN 1 END) as failed_conversations
      FROM conversations
    `;

        const params = [];
        if (gameId) {
            query += ` WHERE game_id = ?`;
            params.push(gameId);
        }

        return await this.db.get(query, params);
    }

    async getRecentConversations(limit = 5, gameId = null) {
        let query = `
      SELECT id, game_id, theme, language, status, created_at 
      FROM conversations
    `;

        const params = [];
        if (gameId) {
            query += ` WHERE game_id = ?`;
            params.push(gameId);
        }

        query += ` ORDER BY created_at DESC LIMIT ?`;
        params.push(limit);

        return await this.db.all(query, params);
    }

    async close() {
        if (this.db) {
            await this.db.close();
            console.log('Database connection closed');
        }
    }
}

export default Database;