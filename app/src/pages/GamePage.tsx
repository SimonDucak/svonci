import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { LocaleCode } from '../types/LocaleCode';
import type { TranslationPair } from '../types/TranslationPair';
import type { LocaleConfig } from '../types/LocaleConfig';
import { getTranslationByLocale } from '../utils/locale';

// Import components
import { GameHeader } from '../components/GameHeader';
import { GameColumn } from '../components/GameColumn';
import { Toast } from '../components/Toast';
import { Confetti } from '../components/Confetti';
import { Loader } from '../components/Loader';
import { getBaseApiUrl } from '../api';

// Type for tracking mistakes
interface MistakeRecord {
    sourceId: number;
    targetId: number;
    sourceWord: string;
    targetWord: string;
    correctTargetWord: string;
    timestamp: Date;
}

const AVAILABLE_LOCALES: LocaleCode[] = ['zh-CN', 'en-US', 'ja-JP', 'ko-KR', 'es-ES', 'fr-FR', 'de-DE'];

const localeConfig: Record<string, LocaleConfig> = {
    'zh-CN': {
        displayName: 'Chinese',
        nativeName: '中文',
        supportsPronunciation: true
    },
    'en-US': {
        displayName: 'English',
        nativeName: 'English',
        supportsPronunciation: true
    },
    'ja-JP': {
        displayName: 'Japanese',
        nativeName: '日本語',
        supportsPronunciation: true
    },
    'ko-KR': {
        displayName: 'Korean',
        nativeName: '한국어',
        supportsPronunciation: true
    },
    'es-ES': {
        displayName: 'Spanish',
        nativeName: 'Español',
        supportsPronunciation: true
    },
    'fr-FR': {
        displayName: 'French',
        nativeName: 'Français',
        supportsPronunciation: true
    },
    'de-DE': {
        displayName: 'German',
        nativeName: 'Deutsch',
        supportsPronunciation: true
    }
};

// Custom hooks
const useKeyboardControls = (
    shuffledSource: TranslationPair[],
    shuffledTarget: TranslationPair[],
    batchMatchedPairs: number[],
    handleSourceClick: (item: TranslationPair) => void,
    handleTargetClick: (item: TranslationPair) => void,
    isModalOpen: boolean
) => {
    const sourceKeys = ['a', 's', 'd', 'f', 'g'];
    const targetKeys = ['1', '2', '3', '4', '5'];

    useEffect(() => {
        const handleKeyPress = (event: KeyboardEvent) => {
            if (isModalOpen) return;

            const key = event.key.toLowerCase();

            const sourceIndex = sourceKeys.indexOf(key);
            if (sourceIndex !== -1 && sourceIndex < shuffledSource.length) {
                const item = shuffledSource[sourceIndex];
                if (!batchMatchedPairs.includes(item.id)) {
                    handleSourceClick(item);
                }
            }

            const targetIndex = targetKeys.indexOf(key);
            if (targetIndex !== -1 && targetIndex < shuffledTarget.length) {
                const item = shuffledTarget[targetIndex];
                if (!batchMatchedPairs.includes(item.id)) {
                    handleTargetClick(item);
                }
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [shuffledSource, shuffledTarget, batchMatchedPairs, handleSourceClick, handleTargetClick, isModalOpen]);

    return { sourceKeys, targetKeys };
};

export default function GamePage(): JSX.Element {
    const { id: gameId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const BATCH_SIZE = 5;

    // Loading state
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    // Game data
    const [gameName, setGameName] = useState<string>('');
    const [sourceLocale, setSourceLocale] = useState<LocaleCode>('zh-CN');
    const [targetLocale, setTargetLocale] = useState<LocaleCode>('en-US');
    const [allTranslations, setAllTranslations] = useState<TranslationPair[]>([]);

    // Game state
    const [shuffledDataset, setShuffledDataset] = useState<TranslationPair[]>([]);
    const [currentBatchIndex, setCurrentBatchIndex] = useState<number>(0);
    const [currentBatch, setCurrentBatch] = useState<TranslationPair[]>([]);
    const [shuffledSource, setShuffledSource] = useState<TranslationPair[]>([]);
    const [shuffledTarget, setShuffledTarget] = useState<TranslationPair[]>([]);
    const [selectedSource, setSelectedSource] = useState<TranslationPair | null>(null);
    const [selectedTarget, setSelectedTarget] = useState<TranslationPair | null>(null);
    const [matchedPairs, setMatchedPairs] = useState<number[]>([]);
    const [batchMatchedPairs, setBatchMatchedPairs] = useState<number[]>([]);

    // Mistake tracking
    const [mistakes, setMistakes] = useState<MistakeRecord[]>([]);
    const [mistakeCountByPair, setMistakeCountByPair] = useState<Record<number, number>>({});
    const [showSummary, setShowSummary] = useState<boolean>(false);

    // UI state
    const [showToast, setShowToast] = useState<boolean>(false);
    const [toastMessage, setToastMessage] = useState<string>('');
    const [toastType, setToastType] = useState<'success' | 'error'>('success');
    const [showConfetti, setShowConfetti] = useState<boolean>(false);
    const [gameCompleted, setGameCompleted] = useState<boolean>(false);
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

    // Utility functions
    const shuffleArray = (array: TranslationPair[]): TranslationPair[] => {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    };

    const pronounceText = (text: string, locale: LocaleCode): void => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = locale;
            utterance.rate = 0.8;
            utterance.pitch = 1;
            utterance.volume = 1;
            window.speechSynthesis.speak(utterance);
        }
    };

    const showToastMessage = (message: string, type: 'success' | 'error'): void => {
        setToastMessage(message);
        setToastType(type);
        setShowToast(true);

        setTimeout(() => {
            setShowToast(false);
        }, 2000);
    };

    // Load game from backend
    useEffect(() => {
        const loadGame = async () => {
            if (!gameId) {
                navigate('/');
                return;
            }

            try {
                setIsLoading(true);
                const response = await fetch(`${getBaseApiUrl()}/api/games/${gameId}`);

                if (!response.ok) {
                    throw new Error('Game not found');
                }

                const result = await response.json();
                const gameData = result.data;

                setGameName(gameData.name);
                setSourceLocale(gameData.sourceLocale || gameData.source_locale);
                setTargetLocale(gameData.targetLocale || gameData.target_locale);
                setAllTranslations(gameData.translations);

                // Initialize game with loaded data
                const shuffledData = shuffleArray(gameData.translations);
                setShuffledDataset(shuffledData);

                // Load first batch
                const startIdx = 0;
                const endIdx = Math.min(BATCH_SIZE, shuffledData.length);
                const batch = shuffledData.slice(startIdx, endIdx);

                setCurrentBatch(batch);
                setShuffledSource(shuffleArray(batch));
                setShuffledTarget(shuffleArray(batch));

                setIsLoading(false);
            } catch (error) {
                console.error('Error loading game:', error);
                setLoadError('Failed to load game. Please check the URL or try again.');
                setIsLoading(false);
            }
        };

        loadGame();
    }, [gameId, navigate]);

    // Game logic
    const loadBatch = (batchIndex: number, dataset?: TranslationPair[]): void => {
        const dataToUse = dataset || shuffledDataset;
        if (!dataToUse || dataToUse.length === 0) return;

        const startIdx = batchIndex * BATCH_SIZE;
        const endIdx = Math.min(startIdx + BATCH_SIZE, dataToUse.length);
        const batch = dataToUse.slice(startIdx, endIdx);

        setCurrentBatch(batch);
        setShuffledSource(shuffleArray(batch));
        setShuffledTarget(shuffleArray(batch));
        setSelectedSource(null);
        setSelectedTarget(null);
        setBatchMatchedPairs([]);
    };

    const resetGame = (): void => {
        const newShuffledDataset = shuffleArray(allTranslations);
        setShuffledDataset(newShuffledDataset);

        setCurrentBatchIndex(0);
        setMatchedPairs([]);
        setBatchMatchedPairs([]);
        setGameCompleted(false);
        setShowConfetti(false);
        setSelectedSource(null);
        setSelectedTarget(null);
        setMistakes([]);
        setMistakeCountByPair({});
        setShowSummary(false);

        loadBatch(0, newShuffledDataset);
    };

    const checkMatch = (): void => {
        if (!selectedSource || !selectedTarget) return;

        if (selectedSource.id === selectedTarget.id) {
            // Correct match
            setMatchedPairs([...matchedPairs, selectedSource.id]);
            setBatchMatchedPairs([...batchMatchedPairs, selectedSource.id]);
            showToastMessage('Perfect match! 🎉', 'success');

            const sourceTranslation = getTranslationByLocale(selectedSource, sourceLocale);
            if (sourceTranslation && localeConfig[sourceLocale].supportsPronunciation) {
                pronounceText(sourceTranslation.writingForm, sourceLocale);
            }

            setTimeout(() => {
                setSelectedSource(null);
                setSelectedTarget(null);
            }, 500);
        } else {
            // Incorrect match - track the mistake
            const sourceTranslation = getTranslationByLocale(selectedSource, sourceLocale);
            const targetTranslation = getTranslationByLocale(selectedTarget, targetLocale);
            const correctTargetPair = allTranslations.find(t => t.id === selectedSource.id);
            const correctTargetTranslation = correctTargetPair ? getTranslationByLocale(correctTargetPair, targetLocale) : null;

            if (sourceTranslation && targetTranslation && correctTargetTranslation) {
                const mistake: MistakeRecord = {
                    sourceId: selectedSource.id,
                    targetId: selectedTarget.id,
                    sourceWord: sourceTranslation.writingForm,
                    targetWord: targetTranslation.writingForm,
                    correctTargetWord: correctTargetTranslation.writingForm,
                    timestamp: new Date()
                };

                setMistakes(prev => [...prev, mistake]);

                // Track mistake count per pair
                setMistakeCountByPair(prev => ({
                    ...prev,
                    [selectedSource.id]: (prev[selectedSource.id] || 0) + 1
                }));
            }

            showToastMessage('Not quite! Try again 🔄', 'error');

            setTimeout(() => {
                setSelectedSource(null);
                setSelectedTarget(null);
            }, 1000);
        }
    };

    // Event handlers
    const handleSourceClick = (item: TranslationPair): void => {
        if (batchMatchedPairs.includes(item.id)) return;
        setSelectedSource(item);

        const translation = getTranslationByLocale(item, sourceLocale);
        if (translation && localeConfig[sourceLocale].supportsPronunciation) {
            pronounceText(translation.writingForm, sourceLocale);
        }
    };

    const handleTargetClick = (item: TranslationPair): void => {
        if (batchMatchedPairs.includes(item.id)) return;
        setSelectedTarget(item);
    };

    const handleUpdateTranslations = async (
        newTranslations: TranslationPair[],
        newLocales?: LocaleCode[]
    ) => {
        try {
            // Update game in backend
            const response = await fetch(`${getBaseApiUrl()}/api/games/${gameId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: gameName,
                    sourceLocale: newLocales ? newLocales[0] : sourceLocale,
                    targetLocale: newLocales ? newLocales[1] : targetLocale,
                    translations: newTranslations
                })
            });

            if (response.ok) {
                console.log('Game updated in backend');

                // Update local state
                if (newLocales) {
                    setSourceLocale(newLocales[0]);
                    setTargetLocale(newLocales[1]);
                }
                setAllTranslations(newTranslations);

                // Restart game with new data
                const shuffledData = shuffleArray(newTranslations);
                setShuffledDataset(shuffledData);
                setCurrentBatchIndex(0);
                setMatchedPairs([]);
                setBatchMatchedPairs([]);
                setGameCompleted(false);
                setMistakes([]);
                setMistakeCountByPair({});
                setShowSummary(false);

                loadBatch(0, shuffledData);
                showToastMessage('Game updated successfully!', 'success');
            }
        } catch (error) {
            console.error('Error updating game:', error);
            showToastMessage('Failed to update game', 'error');
        }
    };

    // Effects
    useEffect(() => {
        if (selectedSource && selectedTarget) {
            checkMatch();
        }
    }, [selectedSource, selectedTarget]);

    useEffect(() => {
        if (batchMatchedPairs.length === currentBatch.length && currentBatch.length > 0) {
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 2000);

            const nextBatchIndex = currentBatchIndex + 1;
            const hasMoreBatches = nextBatchIndex * BATCH_SIZE < shuffledDataset.length;

            if (hasMoreBatches) {
                showToastMessage(`Round ${currentBatchIndex + 1} complete! Loading next round...`, 'success');
                setTimeout(() => {
                    setCurrentBatchIndex(nextBatchIndex);
                    loadBatch(nextBatchIndex);
                }, 2500);
            } else {
                setGameCompleted(true);
                setShowSummary(true);
                setShowConfetti(true);
                setTimeout(() => setShowConfetti(false), 3000);
            }
        }
    }, [batchMatchedPairs, currentBatch, shuffledDataset]);

    // Custom hooks
    const { sourceKeys, targetKeys } = useKeyboardControls(
        shuffledSource,
        shuffledTarget,
        batchMatchedPairs,
        handleSourceClick,
        handleTargetClick,
        isModalOpen
    );

    // Calculate summary stats
    const getAccuracyRate = () => {
        const totalAttempts = matchedPairs.length + mistakes.length;
        if (totalAttempts === 0) return 100;
        return Math.round((matchedPairs.length / totalAttempts) * 100);
    };

    const getMostMissedPairs = () => {
        return Object.entries(mistakeCountByPair)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([pairId, count]) => {
                const pair = allTranslations.find(t => t.id === Number(pairId));
                const sourceTranslation = pair ? getTranslationByLocale(pair, sourceLocale) : null;
                const targetTranslation = pair ? getTranslationByLocale(pair, targetLocale) : null;
                return {
                    source: sourceTranslation?.writingForm || '',
                    sourceReading: sourceTranslation?.readingForm || '',
                    target: targetTranslation?.writingForm || '',
                    targetReading: targetTranslation?.readingForm || '',
                    mistakes: count
                };
            });
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="app-container">
                <Loader message="Loading game..." />
            </div>
        );
    }

    // Error state
    if (loadError) {
        return (
            <div className="app-container">
                <div className="error-container">
                    <div className="error-message">{loadError}</div>
                    <button className="play-again-btn" onClick={() => navigate('/')}>
                        Create New Game
                    </button>
                </div>
            </div>
        );
    }

    // Computed values
    const sourceConfig = localeConfig[sourceLocale];
    const targetConfig = localeConfig[targetLocale];
    const totalBatches = Math.ceil(shuffledDataset.length / BATCH_SIZE);

    return (
        <div className="app-container">
            <div className="content-wrapper">
                <GameHeader
                    currentBatchIndex={currentBatchIndex}
                    totalBatches={totalBatches}
                    batchMatchedPairs={batchMatchedPairs.length}
                    currentBatchLength={currentBatch.length}
                    totalMatchedPairs={matchedPairs.length}
                    totalPairs={shuffledDataset.length}
                    gameCompleted={gameCompleted}
                    onReset={resetGame}
                    translations={allTranslations}
                    locales={[sourceLocale, targetLocale]}
                    onUpdateTranslations={handleUpdateTranslations}
                    onModalStateChange={setIsModalOpen}
                    availableLocales={AVAILABLE_LOCALES}
                    localeConfig={localeConfig}
                    gameId={gameId}
                />

                <div className="game-board">
                    <GameColumn
                        title={`${sourceConfig.nativeName} • ${sourceConfig.displayName}`}
                        items={shuffledSource}
                        locale={sourceLocale}
                        localeConfig={sourceConfig}
                        selectedItem={selectedSource}
                        matchedPairs={batchMatchedPairs}
                        keyMappings={sourceKeys}
                        currentBatchIndex={currentBatchIndex}
                        onItemClick={handleSourceClick}
                    />

                    <GameColumn
                        title={targetConfig.displayName}
                        items={shuffledTarget}
                        locale={targetLocale}
                        localeConfig={targetConfig}
                        selectedItem={selectedTarget}
                        matchedPairs={batchMatchedPairs}
                        keyMappings={targetKeys}
                        currentBatchIndex={currentBatchIndex}
                        onItemClick={handleTargetClick}
                    />
                </div>
            </div>

            <Toast
                show={showToast}
                message={toastMessage}
                type={toastType}
            />

            <Confetti show={showConfetti} />

            {/* Game Summary Modal */}
            {showSummary && gameCompleted && (
                <div className="modal-overlay" onClick={() => setShowSummary(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                        <div className="modal-header">
                            <h2 className="modal-title">🎉 Game Complete!</h2>
                            <button className="modal-close-btn" onClick={() => setShowSummary(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                <h3 style={{ color: '#6366f1', fontSize: '2rem', margin: '10px 0' }}>
                                    {getAccuracyRate()}% Accuracy
                                </h3>
                                <p style={{ color: '#a1a1aa', fontSize: '1rem' }}>
                                    {matchedPairs.length} correct matches • {mistakes.length} mistake{mistakes.length !== 1 ? 's' : ''}
                                </p>
                            </div>

                            {mistakes.length > 0 && (
                                <div style={{ marginTop: '30px' }}>
                                    <h4 style={{ color: '#fafafa', marginBottom: '15px', fontSize: '1.1rem' }}>
                                        Words to Practice:
                                    </h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {getMostMissedPairs().map((pair, index) => (
                                            <div key={index} style={{
                                                background: '#18181b',
                                                border: '1px solid #27272a',
                                                borderRadius: '6px',
                                                padding: '12px',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center'
                                            }}>
                                                <div style={{ display: 'flex', gap: '20px', flex: 1, alignItems: 'center' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                        <span style={{ color: '#fafafa' }}>{pair.source}</span>
                                                        {pair.sourceReading && (
                                                            <span style={{ color: '#71717a', fontSize: '0.75rem' }}>
                                                                {pair.sourceReading}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span style={{ color: '#6366f1' }}>→</span>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                        <span style={{ color: '#a1a1aa' }}>{pair.target}</span>
                                                        {pair.targetReading && (
                                                            <span style={{ color: '#71717a', fontSize: '0.75rem' }}>
                                                                {pair.targetReading}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <span style={{
                                                    background: '#dc2626',
                                                    color: '#fafafa',
                                                    padding: '2px 8px',
                                                    borderRadius: '4px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '600',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {pair.mistakes} mistake{pair.mistakes > 1 ? 's' : ''}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {mistakes.length === 0 && (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '30px',
                                    background: '#14532d',
                                    borderRadius: '8px',
                                    border: '1px solid #16a34a'
                                }}>
                                    <h3 style={{ color: '#86efac', fontSize: '1.5rem', marginBottom: '10px' }}>
                                        Perfect Score! 🌟
                                    </h3>
                                    <p style={{ color: '#bbf7d0' }}>
                                        You matched all {matchedPairs.length} pairs without any mistakes!
                                    </p>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="modal-cancel-btn" onClick={() => setShowSummary(false)}>
                                Close
                            </button>
                            <button className="modal-save-btn" onClick={resetGame}>
                                Play Again
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}