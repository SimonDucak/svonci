import dotenv from 'dotenv';  // Option 2: Traditional style
dotenv.config();

import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import Database from './database.js';
import OpenAI from 'openai';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Initialize database
const db = new Database();
await db.init();

// ============================================
// GAME ENDPOINTS
// ============================================

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});


// 1. CREATE GAME
app.post('/api/games', async (req, res) => {
    try {
        const gameId = uuidv4();
        const game = {
            id: gameId,
            name: req.body.name || 'Untitled Game',
            sourceLocale: req.body.sourceLocale || 'zh-CN',
            targetLocale: req.body.targetLocale || 'en-US',
            translations: req.body.translations || []
        };

        // Save to database
        await db.createGame(game);

        // Fetch the created game
        const createdGame = await db.getGame(gameId);

        res.status(201).json({
            success: true,
            data: {
                ...createdGame,
                sourceLocale: createdGame.source_locale,
                targetLocale: createdGame.target_locale
            },
            message: 'Game created successfully'
        });
    } catch (error) {
        console.error('Error creating game:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 2. GET SINGLE GAME
app.get('/api/games/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Fetch from database
        const game = await db.getGame(id);

        if (!game) {
            return res.status(404).json({
                success: false,
                error: 'Game not found'
            });
        }

        res.json({
            success: true,
            data: {
                ...game,
                sourceLocale: game.source_locale,
                targetLocale: game.target_locale
            }
        });
    } catch (error) {
        console.error('Error fetching game:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 3. GET ALL GAMES
app.get('/api/games', async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '' } = req.query;

        // Fetch from database with pagination
        const result = await db.getGames(
            parseInt(page),
            parseInt(limit),
            search
        );

        // Transform the games to match API format
        const games = result.games.map(game => ({
            ...game,
            sourceLocale: game.source_locale,
            targetLocale: game.target_locale,
            wordCount: game.translations ? JSON.parse(game.translations).length : 0
        }));

        res.json({
            success: true,
            data: games,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: result.total,
                totalPages: result.totalPages
            }
        });
    } catch (error) {
        console.error('Error fetching games:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 4. UPDATE GAME (Replace entire game object)
app.put('/api/games/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if game exists
        const existingGame = await db.getGame(id);
        if (!existingGame) {
            return res.status(404).json({
                success: false,
                error: 'Game not found'
            });
        }

        const updatedGame = {
            name: req.body.name || existingGame.name,
            sourceLocale: req.body.sourceLocale || existingGame.source_locale,
            targetLocale: req.body.targetLocale || existingGame.target_locale,
            translations: req.body.translations || existingGame.translations
        };

        // Update in database
        await db.updateGame(id, updatedGame);

        // Fetch the updated game
        const game = await db.getGame(id);

        res.json({
            success: true,
            data: {
                ...game,
                sourceLocale: game.source_locale,
                targetLocale: game.target_locale
            },
            message: 'Game updated successfully'
        });
    } catch (error) {
        console.error('Error updating game:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 5. DELETE GAME
app.delete('/api/games/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if game exists
        const existingGame = await db.getGame(id);
        if (!existingGame) {
            return res.status(404).json({
                success: false,
                error: 'Game not found'
            });
        }

        // Delete from database
        await db.deleteGame(id);

        res.json({
            success: true,
            message: 'Game deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting game:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// GENERATION ENDPOINT
// ============================================

// Language configuration
const languages = {
    'zh-CN': { name: 'Chinese', readingForm: 'pinyin' },
    'en-US': { name: 'English', readingForm: null },
    'ja-JP': { name: 'Japanese', readingForm: 'hiragana' },
    'ko-KR': { name: 'Korean', readingForm: 'romanization' },
    'es-ES': { name: 'Spanish', readingForm: null },
    'fr-FR': { name: 'French', readingForm: null },
    'de-DE': { name: 'German', readingForm: null }
};

app.post('/api/generate', async (req, res) => {
    try {
        const {
            theme,
            wordCount = 10,
            sourceLocale,
            targetLocale
        } = req.body;

        // Validate
        if (!sourceLocale || !targetLocale) {
            return res.status(400).json({
                success: false,
                error: 'Source and target locales are required'
            });
        }

        const sourceLang = languages[sourceLocale];
        const targetLang = languages[targetLocale];

        // Build reading form instructions
        let readingInstructions = '';
        if (sourceLang.readingForm) {
            readingInstructions += `\n- Include ${sourceLang.readingForm} as readingForm for ${sourceLang.name}`;
        }
        if (targetLang.readingForm) {
            readingInstructions += `\n- Include ${targetLang.readingForm} as readingForm for ${targetLang.name}`;
        }

        // Create prompt with stronger JSON instructions
        const systemPrompt = `You are a language teacher creating vocabulary flashcards. 
Generate exactly ${wordCount} vocabulary translations from ${sourceLang.name} to ${targetLang.name}.

CRITICAL: Return ONLY valid JSON, no other text before or after.
The response must start with [ and end with ]

JSON structure:
[{
  "id": 1,
  "translations": [
    {"writingForm": "source word", ${sourceLang.readingForm ? '"readingForm": "reading",' : ''} "locale": "${sourceLocale}"},
    {"writingForm": "target word", ${targetLang.readingForm ? '"readingForm": "reading",' : ''} "locale": "${targetLocale}"}
  ]
}]${readingInstructions}

Rules:
- Output ONLY the JSON array
- No explanations or additional text
- Ensure valid JSON syntax`;

        const userPrompt = theme
            ? `${wordCount} vocabulary pairs about: ${theme}`
            : `${wordCount} common vocabulary pairs`;

        // Call OpenAI
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo", // or "gpt-4" if you have access
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.7
        });

        // Parse response - handle potential text around JSON
        const content = response.choices[0].message.content;
        let translations;

        try {
            // Try to extract JSON from the response
            // Sometimes GPT adds text before/after the JSON
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                translations = JSON.parse(jsonMatch[0]);
            } else {
                // Try direct parse as fallback
                translations = JSON.parse(content);
            }
        } catch (parseError) {
            console.error('Failed to parse JSON:', content);
            throw new Error('Invalid JSON response from AI');
        }

        // Extract array if wrapped in object
        if (!Array.isArray(translations)) {
            translations = Object.values(translations).find(val => Array.isArray(val)) || [];
        }

        // Clean up translations
        translations = translations.map((pair, index) => ({
            id: pair.id || index + 1,
            translations: [
                {
                    writingForm: pair.translations[0].writingForm,
                    ...(pair.translations[0].readingForm && { readingForm: pair.translations[0].readingForm }),
                    locale: sourceLocale
                },
                {
                    writingForm: pair.translations[1].writingForm,
                    ...(pair.translations[1].readingForm && { readingForm: pair.translations[1].readingForm }),
                    locale: targetLocale
                }
            ]
        }));

        res.json({
            success: true,
            data: {
                theme: theme || 'General vocabulary',
                sourceLocale,
                targetLocale,
                translations,
                wordCount: translations.length,
                generatedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Error generating vocabulary:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to generate vocabulary'
        });
    }
});

const validateInput = (req, res, next) => {
    const { gameId, theme, language, vocabulary } = req.body;

    // Validate gameId
    if (!gameId || typeof gameId !== 'string') {
        return res.status(400).json({
            error: 'Game ID is required and must be a string'
        });
    }

    // Validate theme
    if (!theme || typeof theme !== 'string' || theme.length > 100) {
        return res.status(400).json({
            error: 'Theme must be a string with max 100 characters'
        });
    }

    // Validate language
    if (!language || !languages[language]) {
        return res.status(400).json({
            error: 'Invalid language code'
        });
    }

    // Validate vocabulary
    if (!vocabulary || !Array.isArray(vocabulary) || vocabulary.length === 0) {
        return res.status(400).json({
            error: 'Vocabulary must be a non-empty array of strings'
        });
    }

    if (!vocabulary.every(word => typeof word === 'string')) {
        return res.status(400).json({
            error: 'All vocabulary items must be strings'
        });
    }

    next();
};

// Main endpoint with database integration
app.post('/api/generate/conversation', validateInput, async (req, res) => {
    const { gameId, theme, language, vocabulary } = req.body;

    // Check if game exists
    try {
        const game = await db.getGame(gameId);
        if (!game) {
            return res.status(404).json({
                error: `Game not found with ID: ${gameId}`
            });
        }
        console.log(`Found game: ${game.name} (${game.id})`);
    } catch (dbError) {
        console.error('Database error checking game:', dbError);
        console.error('Game ID attempted:', gameId);
        return res.status(500).json({
            error: 'Failed to verify game ID',
            details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
        });
    }

    let conversationId = null;

    try {
        const langInfo = languages[language];

        // Build optimized prompt with clearer structure
        const systemPrompt = `Generate ${langInfo.name} dialogue. Return JSON:
{"exchanges": [{"speaker1": "...", "speaker2": "..."}, ...]} 
5 exchanges, real sentences only, no labels/letters, use provided vocabulary naturally.`;

        const userPrompt = `Theme: ${theme}
Words: ${vocabulary.slice(0, 15).join(', ')}
${langInfo.readingForm ? `Add ${langInfo.readingForm} in parentheses` : ''}`;

        // Call OpenAI API
        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 800,  // Increased for languages with reading forms
            response_format: { type: "json_object" }
        });

        // Parse the response
        let conversationData = [];
        let rawResponse = null;
        let status = 'success';
        let errorMessage = null;

        try {
            const content = completion.choices[0].message.content;
            rawResponse = content; // Store raw response for debugging

            // Check if response might be truncated
            if (completion.choices[0].finish_reason === 'length') {
                console.warn('Response was truncated due to max_tokens limit');

                // Try to fix truncated JSON by closing it properly
                let fixedContent = content;

                // Count open braces and brackets
                const openBraces = (content.match(/{/g) || []).length;
                const closeBraces = (content.match(/}/g) || []).length;
                const openBrackets = (content.match(/\[/g) || []).length;
                const closeBrackets = (content.match(/\]/g) || []).length;

                // Add missing quotes if string is unterminated
                if ((content.match(/"/g) || []).length % 2 !== 0) {
                    fixedContent += '"';
                }

                // Add missing braces
                for (let i = 0; i < openBraces - closeBraces; i++) {
                    fixedContent += '}';
                }

                // Add missing brackets
                for (let i = 0; i < openBrackets - closeBrackets; i++) {
                    fixedContent += ']';
                }

                content = fixedContent;
            }

            const parsed = JSON.parse(content);

            // Handle the expected structure
            if (parsed.exchanges && Array.isArray(parsed.exchanges)) {
                // Convert from object format to array format
                conversationData = parsed.exchanges.map(exchange => [
                    exchange.speaker1 || exchange.person1 || exchange.a || "",
                    exchange.speaker2 || exchange.person2 || exchange.b || ""
                ]);
            } else if (parsed.conversation && Array.isArray(parsed.conversation)) {
                // Handle if AI returns in our desired format already
                conversationData = parsed.conversation;
            } else if (Array.isArray(parsed)) {
                // Direct array response
                conversationData = parsed;
            }

            // Filter out any empty or invalid exchanges
            conversationData = conversationData.filter(exchange =>
                Array.isArray(exchange) &&
                exchange.length === 2 &&
                exchange[0] && exchange[1] &&
                typeof exchange[0] === 'string' &&
                typeof exchange[1] === 'string'
            );

        } catch (parseError) {
            console.error('Parse error:', parseError);
            console.error('Raw response:', rawResponse);
            status = 'error';
            errorMessage = `Parse error: ${parseError.message}`;
        }

        // Save conversation to database
        try {
            const conversationRecord = await db.createConversation({
                gameId: gameId,
                theme: theme,
                language: language,
                vocabulary: vocabulary,
                conversation: conversationData,
                rawResponse: rawResponse,
                status: status,
                errorMessage: errorMessage
            });

            conversationId = conversationRecord.id;
        } catch (dbError) {
            console.error('Database error saving conversation:', dbError);
            // Don't fail the request if save fails, but log it
        }

        // If parsing failed, return the raw response
        if (status === 'error') {
            return res.status(200).json({
                id: conversationId,
                gameId: gameId,
                language: language,
                conversation: [],
                raw: rawResponse,
                error: 'Could not parse AI response into expected format',
                parseError: errorMessage
            });
        }

        // Validate we have conversations
        if (!conversationData || conversationData.length === 0) {
            // Update database record with warning
            if (conversationId) {
                await db.updateConversation(conversationId, {
                    status: 'warning',
                    errorMessage: 'No valid conversation extracted'
                });
            }

            // If we have raw response but no parsed data, return it for debugging
            if (rawResponse) {
                return res.status(200).json({
                    id: conversationId,
                    gameId: gameId,
                    language: language,
                    conversation: [],
                    raw: rawResponse,
                    warning: 'No valid conversation could be extracted, returning raw response'
                });
            }
            return res.status(500).json({
                error: 'No valid conversation generated. Please try again.'
            });
        }

        // Ensure exactly 5 exchanges
        if (conversationData.length > 5) {
            conversationData = conversationData.slice(0, 5);
        }

        // Update the database record with successful parsed data if needed
        if (conversationId && conversationData.length > 0) {
            await db.updateConversation(conversationId, {
                conversation: conversationData,
                status: 'success'
            });
        }

        // Return the response with conversation ID
        res.json({
            id: conversationId,
            gameId: gameId,
            language: language,
            conversation: conversationData
        });

    } catch (error) {
        console.error('Error generating conversation:', error);

        // Try to save error to database
        if (conversationId === null && req.app.locals.db) {
            try {
                const errorRecord = await req.app.locals.db.createConversation({
                    gameId: gameId,
                    theme: theme,
                    language: language,
                    vocabulary: vocabulary,
                    conversation: [],
                    rawResponse: null,
                    status: 'error',
                    errorMessage: error.message
                });
                conversationId = errorRecord.id;
            } catch (dbError) {
                console.error('Failed to save error to database:', dbError);
            }
        }

        // Check for specific OpenAI errors
        if (error.response?.status === 429) {
            return res.status(429).json({
                id: conversationId,
                error: 'Rate limit exceeded. Please try again later.'
            });
        }

        if (error.response?.status === 401) {
            return res.status(500).json({
                id: conversationId,
                error: 'OpenAI API authentication failed'
            });
        }

        res.status(500).json({
            id: conversationId,
            error: 'Failed to generate conversation',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Get conversations for a specific game
app.get('/api/games/:gameId/conversations', async (req, res) => {
    const { gameId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    try {
        const conversations = await db.getConversationsByGameId(gameId, {
            page: parseInt(page),
            limit: parseInt(limit)
        });

        res.json(conversations);
    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({
            error: 'Failed to fetch conversations'
        });
    }
});

// Get a specific conversation
app.get('/api/conversations/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const conversation = await db.getConversation(parseInt(id));

        if (!conversation) {
            return res.status(404).json({
                error: 'Conversation not found'
            });
        }

        res.json(conversation);
    } catch (error) {
        console.error('Error fetching conversation:', error);
        res.status(500).json({
            error: 'Failed to fetch conversation'
        });
    }
});

// ============================================
// HEALTH CHECK
// ============================================

app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString()
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`✨ Translation Match Backend running on http://localhost:${PORT}`);
    console.log(`📚 SQLite database: ./database.sqlite`);
});