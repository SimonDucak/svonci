import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TranslationPair } from '../types/TranslationPair';
import type { LocaleCode } from '../types/LocaleCode';
import { TranslationModal } from './TranslationModal';
import { getBaseApiUrl } from '../api';

interface GameHeaderProps {
    currentBatchIndex: number;
    totalBatches: number;
    batchMatchedPairs: number;
    currentBatchLength: number;
    totalMatchedPairs: number;
    totalPairs: number;
    gameCompleted: boolean;
    onReset: () => void;
    translations: TranslationPair[];
    locales: LocaleCode[];
    onUpdateTranslations: (translations: TranslationPair[], newLocales?: LocaleCode[], gameId?: string) => void;
    onModalStateChange?: (isOpen: boolean) => void;
    availableLocales?: LocaleCode[];
    localeConfig?: Record<string, any>;
    gameId?: string | null;
}

export const GameHeader: React.FC<GameHeaderProps> = ({
    currentBatchIndex,
    totalBatches,
    batchMatchedPairs,
    currentBatchLength,
    totalMatchedPairs,
    totalPairs,
    gameCompleted,
    onReset,
    translations,
    locales,
    onUpdateTranslations,
    onModalStateChange,
    availableLocales,
    localeConfig,
    gameId
}) => {
    const navigate = useNavigate();
    const [showModal, setShowModal] = useState(false);

    // Session timer - starts when component mounts
    const [sessionStartTime] = useState<number>(Date.now());
    const [sessionElapsedTime, setSessionElapsedTime] = useState<number>(0);

    // Game timer - tracks individual game time
    const [gameStartTime, setGameStartTime] = useState<number | null>(null);
    const [gameElapsedTime, setGameElapsedTime] = useState<number>(0);
    const [finalTime, setFinalTime] = useState<string | null>(null);
    const [_, setIsNewRecord] = useState(false);

    // Share functionality
    const [showCopiedToast, setShowCopiedToast] = useState(false);

    // Update session timer every second (HH:MM:SS format)
    useEffect(() => {
        const interval = setInterval(() => {
            setSessionElapsedTime(Math.floor((Date.now() - sessionStartTime) / 1000));
        }, 1000);

        return () => clearInterval(interval);
    }, [sessionStartTime]);

    // Start game timer when first match is made
    useEffect(() => {
        if (totalMatchedPairs > 0 && !gameStartTime && !gameCompleted) {
            setGameStartTime(Date.now());
        }
    }, [totalMatchedPairs, gameStartTime, gameCompleted]);

    // Update game timer every second
    useEffect(() => {
        if (!gameStartTime || gameCompleted) return;

        const interval = setInterval(() => {
            setGameElapsedTime(Math.floor((Date.now() - gameStartTime) / 1000));
        }, 1000);

        return () => clearInterval(interval);
    }, [gameStartTime, gameCompleted]);

    // Save final time when game completes
    useEffect(() => {
        if (gameCompleted && gameStartTime && !finalTime) {
            const totalSeconds = Math.floor((Date.now() - gameStartTime) / 1000);
            setFinalTime(formatGameTime(totalSeconds));
        }
    }, [gameCompleted, gameStartTime, finalTime]);

    // Format time as HH:MM:SS for session timer
    const formatSessionTime = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Format time as MM:SS for game timer
    const formatGameTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Reset game timer when game resets
    const handleReset = () => {
        setGameStartTime(null);
        setGameElapsedTime(0);
        setFinalTime(null);
        setIsNewRecord(false);
        onReset();
    };

    // Navigate back to games list
    const handleBackToGames = () => {
        navigate('/');
    };

    // Share game functionality
    const handleShareGame = async () => {
        const currentUrl = window.location.href;

        try {
            // Try to use the modern clipboard API
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(currentUrl);
            } else {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = currentUrl;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                textArea.remove();
            }

            setShowCopiedToast(true);
            setTimeout(() => setShowCopiedToast(false), 2000);
        } catch (error) {
            console.error('Failed to copy URL:', error);
            alert(`Share this link: ${currentUrl}`);
        }
    };

    const handleOpenModal = () => {
        setShowModal(true);
        onModalStateChange?.(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        onModalStateChange?.(false);
    };

    const handleUpdateTranslations = async (newTranslations: TranslationPair[], newLocales?: LocaleCode[]) => {
        // Reset timer when translations change
        setGameStartTime(null);
        setGameElapsedTime(0);
        setFinalTime(null);
        setIsNewRecord(false);

        // If we have a gameId, update the game in the backend
        if (gameId) {
            try {
                const response = await fetch(`${getBaseApiUrl()}/api/games/${gameId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        sourceLocale: newLocales ? newLocales[0] : locales[0],
                        targetLocale: newLocales ? newLocales[1] : locales[1],
                        translations: newTranslations
                    })
                });

                if (response.ok) {
                    console.log('Game updated in backend');
                }
            } catch (error) {
                console.error('Error updating game:', error);
            }
        }

        // Update translations in parent component
        // Convert null to undefined for the function parameter
        onUpdateTranslations(newTranslations, newLocales, gameId || undefined);
    };

    return (
        <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <button
                    className="back-to-games-btn"
                    onClick={handleBackToGames}
                    style={{
                        background: '#27272a',
                        border: '1px solid #3f3f46',
                        color: '#a1a1aa',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#3f3f46';
                        e.currentTarget.style.color = '#fafafa';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#27272a';
                        e.currentTarget.style.color = '#a1a1aa';
                    }}
                >
                    ← Back to Games
                </button>

                <h1 className="title" style={{ margin: 0 }}>✨ Translation Match ✨</h1>

                <div style={{ width: '120px' }}></div> {/* Spacer for centering */}
            </div>

            {/* Session Timer - Always visible, shows total time since page load */}
            <div className="session-timer">
                Session Time: {formatSessionTime(sessionElapsedTime)}
            </div>

            <div className="stats-container">
                <div className="score-badge">
                    Round: {currentBatchIndex + 1}/{totalBatches}
                </div>
                <div className="score-badge">
                    🏆 Score: {batchMatchedPairs}/{currentBatchLength}
                </div>
                <div className="score-badge">
                    📊 Total: {totalMatchedPairs}/{totalPairs}
                </div>

                {/* Game Timer - Shows current game time */}
                <div className="score-badge timer">
                    ⏱️ {finalTime || formatGameTime(gameElapsedTime)}
                </div>

                {/* Share button */}
                <button className="share-btn" onClick={handleShareGame} title="Share game link">
                    📤 Share
                </button>

                <button className="settings-btn" onClick={handleOpenModal} title="Manage translations">
                    ⚙️
                </button>

                {gameCompleted && (
                    <>
                        <button className="play-again-btn" onClick={handleReset}>
                            Play Again
                        </button>
                        {finalTime && (
                            <div className="completion-time">
                                Completed in {finalTime}! 🎉
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Copied toast notification */}
            {showCopiedToast && (
                <div className="copied-toast">
                    📋 Link copied to clipboard!
                </div>
            )}

            <TranslationModal
                isOpen={showModal}
                onClose={handleCloseModal}
                translations={translations}
                onUpdateTranslations={handleUpdateTranslations}
                locales={locales}
                availableLocales={availableLocales}
                localeConfig={localeConfig}
            />
        </>
    );
};