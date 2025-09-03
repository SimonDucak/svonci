import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBaseApiUrl } from '../api';

interface Game {
    id: string;
    name: string;
    source_locale: string;
    target_locale: string;
    sourceLocale?: string;
    targetLocale?: string;
    translations?: string;
    wordCount?: number;
    created_at: string;
    updated_at: string;
}

interface PaginationInfo {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

const localeNames: Record<string, string> = {
    'zh-CN': 'Chinese',
    'en-US': 'English',
    'ja-JP': 'Japanese',
    'ko-KR': 'Korean',
    'es-ES': 'Spanish',
    'fr-FR': 'French',
    'de-DE': 'German'
};

export default function GamesListPage(): JSX.Element {
    const [games, setGames] = useState<Game[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [pagination, setPagination] = useState<PaginationInfo>({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0
    });
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    const navigate = useNavigate();

    // Fetch games from backend
    const fetchGames = async (page: number = 1, search: string = '') => {
        try {
            setIsLoading(true);
            const response = await fetch(
                `${getBaseApiUrl()}/api/games?page=${page}&limit=10&search=${search}`
            );

            if (!response.ok) {
                throw new Error('Failed to fetch games');
            }

            const result = await response.json();
            setGames(result.data);
            setPagination(result.pagination);
            setError(null);
        } catch (err) {
            console.error('Error fetching games:', err);
            setError('Failed to load games. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Initial load
    useEffect(() => {
        fetchGames();
    }, []);

    // Handle search
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchGames(1, searchTerm);
    };

    // Handle pagination
    const handlePageChange = (newPage: number) => {
        fetchGames(newPage, searchTerm);
    };

    // Handle game deletion
    const handleDeleteGame = async (gameId: string, gameName: string) => {
        if (!window.confirm(`Are you sure you want to delete "${gameName}"?`)) {
            return;
        }

        try {
            setIsDeleting(gameId);
            const response = await fetch(`${getBaseApiUrl()}/api/games/${gameId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Failed to delete game');
            }

            // Refresh the list
            fetchGames(pagination.page, searchTerm);
        } catch (err) {
            console.error('Error deleting game:', err);
            alert('Failed to delete game. Please try again.');
        } finally {
            setIsDeleting(null);
        }
    };



    // Format date
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    // Get word count from translations
    const getWordCount = (game: Game): number => {
        if (game.wordCount !== undefined) {
            return game.wordCount;
        }
        if (game.translations) {
            try {
                const parsed = JSON.parse(game.translations);
                return Array.isArray(parsed) ? parsed.length : 0;
            } catch {
                return 0;
            }
        }
        return 0;
    };

    // Navigate to game (using window.location for demo, replace with useNavigate in real app)
    const navigateToGame = (gameId: string) => {
        // window.location.href = `/${gameId}`;
        navigate(`/${gameId}`);
    };

    // Navigate to create
    const navigateToCreate = () => {

        navigate('/new');
    };

    if (isLoading && games.length === 0) {
        return (
            <div className="app-container">
                <div className="games-loading">
                    <div className="games-spinner"></div>
                    <div className="games-loading-text">Loading games...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="app-container">
            <div className="games-list-container">
                {/* Header */}
                <div className="games-list-header">
                    <h1 className="title">📚 My Vocabulary Games</h1>
                    <div className="header-actions">
                        <button onClick={navigateToCreate} className="create-game-btn">
                            + Create New Game
                        </button>
                    </div>
                </div>

                {/* Search Bar */}
                <form onSubmit={handleSearch} className="search-form">
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Search games by name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button type="submit" className="search-btn">
                        🔍 Search
                    </button>
                    {searchTerm && (
                        <button
                            type="button"
                            className="clear-search-btn"
                            onClick={() => {
                                setSearchTerm('');
                                fetchGames(1, '');
                            }}
                        >
                            ✕ Clear
                        </button>
                    )}
                </form>

                {/* Error Message */}
                {error && (
                    <div className="error-message">
                        <span>{error}</span>
                        <button onClick={() => fetchGames()} className="retry-btn">
                            Retry
                        </button>
                    </div>
                )}

                {/* Table or Empty State */}
                {games.length === 0 ? (
                    <div className="no-games">
                        <div className="no-games-icon">🎮</div>
                        <h3>No games found</h3>
                        <p>
                            {searchTerm
                                ? 'Try a different search term'
                                : 'Create your first vocabulary game to get started!'}
                        </p>
                        <button onClick={navigateToCreate} className="create-game-btn">
                            Create Your First Game
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="games-table-container">
                            <table className="games-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Languages</th>
                                        <th>Words</th>
                                        <th>Created</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {games.map((game) => {
                                        const sourceLocale = game.sourceLocale || game.source_locale;
                                        const targetLocale = game.targetLocale || game.target_locale;
                                        const wordCount = getWordCount(game);

                                        return (
                                            <tr key={game.id}>
                                                <td className="game-name-cell">
                                                    <button
                                                        className="game-name-link"
                                                        onClick={() => navigateToGame(game.id)}
                                                    >
                                                        {game.name}
                                                    </button>
                                                </td>
                                                <td>
                                                    <div className="language-cell">
                                                        <span className="language-badge">
                                                            {localeNames[sourceLocale] || sourceLocale}
                                                        </span>
                                                        <span className="language-arrow">→</span>
                                                        <span className="language-badge">
                                                            {localeNames[targetLocale] || targetLocale}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className="word-count-badge">{wordCount}</span>
                                                </td>
                                                <td>{formatDate(game.created_at)}</td>
                                                <td>
                                                    <div className="table-actions">
                                                        <button
                                                            className="play-btn"
                                                            onClick={() => navigateToGame(game.id)}
                                                            title="Play game"
                                                        >
                                                            Play
                                                        </button>
                                                        <button
                                                            className="delete-btn"
                                                            onClick={() => handleDeleteGame(game.id, game.name)}
                                                            disabled={isDeleting === game.id}
                                                            title="Delete game"
                                                        >
                                                            {isDeleting === game.id ? '...' : 'Delete'}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {pagination.totalPages > 1 && (
                            <div className="pagination">
                                <button
                                    className="pagination-btn"
                                    onClick={() => handlePageChange(pagination.page - 1)}
                                    disabled={pagination.page === 1}
                                >
                                    ← Previous
                                </button>
                                <div className="pagination-info">
                                    Page {pagination.page} of {pagination.totalPages}
                                    <span className="pagination-total"> ({pagination.total} games)</span>
                                </div>
                                <button
                                    className="pagination-btn"
                                    onClick={() => handlePageChange(pagination.page + 1)}
                                    disabled={pagination.page === pagination.totalPages}
                                >
                                    Next →
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}