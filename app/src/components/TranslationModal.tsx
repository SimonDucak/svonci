import React, { useState, useEffect } from 'react';
import type { TranslationPair } from '../types/TranslationPair';
import type { Translation } from '../types/Translation';
import type { LocaleCode } from '../types/LocaleCode';
import type { LocaleConfig } from '../types/LocaleConfig';
import { getBaseApiUrl } from '../api';

interface TranslationModalProps {
    isOpen: boolean;
    onClose: () => void;
    translations: TranslationPair[];
    onUpdateTranslations: (translations: TranslationPair[], newLocales?: LocaleCode[]) => void;
    locales: LocaleCode[];
    isSetupMode?: boolean;
    availableLocales?: LocaleCode[];
    localeConfig?: Record<string, LocaleConfig>;
}

export const TranslationModal: React.FC<TranslationModalProps> = ({
    isOpen,
    onClose,
    translations,
    onUpdateTranslations,
    locales,
    isSetupMode = false,
    availableLocales = ['zh-CN', 'en-US', 'ja-JP', 'ko-KR', 'es-ES', 'fr-FR', 'de-DE'],
    localeConfig = {
        'zh-CN': { displayName: 'Chinese', nativeName: '中文', supportsPronunciation: true },
        'en-US': { displayName: 'English', nativeName: 'English', supportsPronunciation: true },
        'ja-JP': { displayName: 'Japanese', nativeName: '日本語', supportsPronunciation: true },
        'ko-KR': { displayName: 'Korean', nativeName: '한국어', supportsPronunciation: true },
        'es-ES': { displayName: 'Spanish', nativeName: 'Español', supportsPronunciation: true },
        'fr-FR': { displayName: 'French', nativeName: 'Français', supportsPronunciation: true },
        'de-DE': { displayName: 'German', nativeName: 'Deutsch', supportsPronunciation: true }
    }
}) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [editedTranslations, setEditedTranslations] = useState<TranslationPair[]>([]);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [vocabularyTheme, setVocabularyTheme] = useState<string>('');
    const [wordCount, setWordCount] = useState<number>(10);
    const [sourceLocale, setSourceLocale] = useState<LocaleCode>(locales[0]);
    const [targetLocale, setTargetLocale] = useState<LocaleCode>(locales[1]);
    const [showLanguageChangeConfirm, setShowLanguageChangeConfirm] = useState<boolean>(false);
    const [pendingLocaleChange, setPendingLocaleChange] = useState<{
        type: 'source' | 'target';
        value: LocaleCode;
    } | null>(null);
    const [showGenerateConfirm, setShowGenerateConfirm] = useState<boolean>(false);
    const [pendingGeneratedTranslations, setPendingGeneratedTranslations] = useState<TranslationPair[]>([]);

    useEffect(() => {
        setEditedTranslations(JSON.parse(JSON.stringify(translations)));
        setSourceLocale(locales[0]);
        setTargetLocale(locales[1]);
    }, [translations, isOpen, locales]);

    const handleSourceLocaleChange = (newLocale: LocaleCode) => {
        if (editedTranslations.length > 0 && newLocale !== sourceLocale) {
            setPendingLocaleChange({ type: 'source', value: newLocale });
            setShowLanguageChangeConfirm(true);
        } else {
            setSourceLocale(newLocale);
        }
    };

    const handleTargetLocaleChange = (newLocale: LocaleCode) => {
        if (editedTranslations.length > 0 && newLocale !== targetLocale) {
            setPendingLocaleChange({ type: 'target', value: newLocale });
            setShowLanguageChangeConfirm(true);
        } else {
            setTargetLocale(newLocale);
        }
    };

    const confirmLanguageChange = () => {
        if (pendingLocaleChange) {
            if (pendingLocaleChange.type === 'source') {
                setSourceLocale(pendingLocaleChange.value);
            } else {
                setTargetLocale(pendingLocaleChange.value);
            }
            setEditedTranslations([]); // Clear all translations
            setEditingId(null);
        }
        setShowLanguageChangeConfirm(false);
        setPendingLocaleChange(null);
    };

    const cancelLanguageChange = () => {
        setShowLanguageChangeConfirm(false);
        setPendingLocaleChange(null);
    };

    if (!isOpen) return null;

    const handleUpdateTranslation = (pairId: number, localeIndex: number, field: 'writingForm' | 'readingForm', value: string) => {
        const updated = editedTranslations.map(pair => {
            if (pair.id === pairId) {
                const newTranslations = [...pair.translations];
                newTranslations[localeIndex] = {
                    ...newTranslations[localeIndex],
                    [field]: value
                };
                return { ...pair, translations: newTranslations };
            }
            return pair;
        });
        setEditedTranslations(updated);
    };

    const handleAddTranslation = () => {
        const newId = Math.max(...editedTranslations.map(t => t.id), 0) + 1;
        const newPair: TranslationPair = {
            id: newId,
            translations: [
                {
                    writingForm: '',
                    readingForm: '',
                    locale: sourceLocale
                },
                {
                    writingForm: '',
                    readingForm: '',
                    locale: targetLocale
                }
            ] as Translation[]
        };
        setEditedTranslations([...editedTranslations, newPair]);
        setEditingId(newId);
    };

    const handleDeleteTranslation = (id: number) => {
        setEditedTranslations(editedTranslations.filter(t => t.id !== id));
    };

    const handleGenerate = async () => {
        // Prevent multiple simultaneous requests
        if (isGenerating) return;

        // Validate that languages are different
        if (sourceLocale === targetLocale) {
            alert('Source and target languages must be different');
            return;
        }

        try {
            setIsGenerating(true);

            console.log('Generating vocabulary:', {
                theme: vocabularyTheme,
                wordCount: wordCount,
                sourceLocale: sourceLocale,
                targetLocale: targetLocale
            });

            // Call the API endpoint
            const response = await fetch(`${getBaseApiUrl()}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    theme: vocabularyTheme || null,
                    wordCount: wordCount,
                    sourceLocale: sourceLocale,
                    targetLocale: targetLocale
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || `Server error: ${response.status}`);
            }

            const result = await response.json();

            if (result.success && result.data.translations && Array.isArray(result.data.translations)) {
                // Check if we got valid translations
                if (result.data.translations.length === 0) {
                    throw new Error('No translations were generated');
                }

                // If user has existing translations, show confirm modal
                if (editedTranslations.length > 0) {
                    setPendingGeneratedTranslations(result.data.translations);
                    setShowGenerateConfirm(true);
                } else {
                    // No existing translations, just add them
                    setEditedTranslations(result.data.translations);
                    setVocabularyTheme('');
                    console.log(`Added ${result.data.translations.length} new translations`);
                }

            } else {
                throw new Error('Invalid response format from server');
            }

        } catch (error: any) {
            console.error('Error generating vocabulary:', error);

            // Handle specific error types
            let errorMessage = 'Failed to generate vocabulary';

            if (error instanceof TypeError && error.message.includes('fetch')) {
                errorMessage = 'Cannot connect to server. Please check if the server is running on port 3001.';
            } else if (error.message?.includes('API key')) {
                errorMessage = 'OpenAI API key is not configured or invalid. Please check server configuration.';
            } else if (error.message?.includes('rate limit')) {
                errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
            } else if (error.message) {
                errorMessage = error.message;
            }

            alert(`${errorMessage}\n\nPlease try again or add translations manually.`);

        } finally {
            setIsGenerating(false);
        }
    };

    const handleAddGenerated = () => {
        // Find the highest existing ID
        const maxId = Math.max(...editedTranslations.map(t => t.id), 0);

        // Renumber the new translations to continue from the highest ID
        const newTranslations = pendingGeneratedTranslations.map((pair, index) => ({
            ...pair,
            id: maxId + index + 1
        }));

        // Append to existing translations
        setEditedTranslations([...editedTranslations, ...newTranslations]);
        console.log(`Added ${newTranslations.length} new translations. Total: ${editedTranslations.length + newTranslations.length}`);

        // Clear state
        setVocabularyTheme('');
        setPendingGeneratedTranslations([]);
        setShowGenerateConfirm(false);
    };

    const handleReplaceGenerated = () => {
        // Replace all translations
        setEditedTranslations(pendingGeneratedTranslations);
        console.log(`Replaced with ${pendingGeneratedTranslations.length} new translations`);

        // Clear state
        setVocabularyTheme('');
        setPendingGeneratedTranslations([]);
        setShowGenerateConfirm(false);
    };

    const handleCancelGenerated = () => {
        // Discard generated translations
        setPendingGeneratedTranslations([]);
        setShowGenerateConfirm(false);
        console.log('Cancelled generation - keeping existing translations');
    };

    const handleSave = () => {
        // Validate that all translations have at least writingForm
        const isValid = editedTranslations.every(pair =>
            pair.translations.every(t => t.writingForm.trim() !== '')
        );

        if (!isValid) {
            alert('All translations must have at least a writing form');
            return;
        }

        if (editedTranslations.length < 5) {
            alert('You must have at least 5 translations for the game to work');
            return;
        }

        // Update locales in translations if they changed
        const updatedTranslations = editedTranslations.map(pair => ({
            ...pair,
            translations: pair.translations.map((t, index) => ({
                ...t,
                locale: index === 0 ? sourceLocale : targetLocale
            }))
        }));

        onUpdateTranslations(updatedTranslations, [sourceLocale, targetLocale]);
        onClose();
    };

    const handleCancel = () => {
        // In setup mode, can't cancel without words
        if (isSetupMode && editedTranslations.length < 5) {
            alert('You need at least 5 translations to continue. Please add some words or use the Generate button.');
            return;
        }
        setEditedTranslations(translations);
        setEditingId(null);
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={isSetupMode ? undefined : handleCancel}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">
                        {isSetupMode ? 'Setup Your Vocabulary' : 'Manage Translations'}
                    </h2>
                    {!isSetupMode && (
                        <button className="modal-close-btn" onClick={handleCancel}>×</button>
                    )}
                </div>

                <div className="modal-body">
                    {isSetupMode && editedTranslations.length === 0 && (
                        <div className="empty-state">
                            <div className="empty-state-icon">📚</div>
                            <h3 className="empty-state-title">No Vocabulary Yet</h3>
                            <p className="empty-state-text">
                                Start by selecting languages and adding words manually or use the Generate button to create a vocabulary set.
                            </p>
                        </div>
                    )}

                    {/* Language Selectors - Always visible at the top */}
                    <div className="language-selector-section">
                        <div className="locale-selectors">
                            <div className="locale-selector-group">
                                <label className="input-label">Source Language (Left Column)</label>
                                <select
                                    className="locale-select"
                                    value={sourceLocale}
                                    onChange={(e) => handleSourceLocaleChange(e.target.value as LocaleCode)}
                                >
                                    {availableLocales.map(locale => (
                                        <option key={locale} value={locale}>
                                            {localeConfig[locale]?.nativeName} ({localeConfig[locale]?.displayName})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="language-arrow">→</div>

                            <div className="locale-selector-group">
                                <label className="input-label">Target Language (Right Column)</label>
                                <select
                                    className="locale-select"
                                    value={targetLocale}
                                    onChange={(e) => handleTargetLocaleChange(e.target.value as LocaleCode)}
                                >
                                    {availableLocales.map(locale => (
                                        <option key={locale} value={locale}>
                                            {localeConfig[locale]?.nativeName} ({localeConfig[locale]?.displayName})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Generation Settings */}
                    <div className="vocabulary-settings">
                        <h3 className="section-title">Generate Vocabulary</h3>
                        <div className="generation-settings">
                            <div className="vocabulary-theme-section">
                                <label className="input-label">Vocabulary Theme (Optional)</label>
                                <textarea
                                    className="vocabulary-theme-input"
                                    placeholder="e.g., Common greetings, Food and drinks, Travel phrases..."
                                    value={vocabularyTheme}
                                    onChange={(e) => setVocabularyTheme(e.target.value)}
                                    maxLength={100}
                                    disabled={isGenerating}
                                />
                                <div className="char-counter">{vocabularyTheme.length}/100</div>
                            </div>

                            <div className="word-count-section">
                                <label className="input-label">Number of Words</label>
                                <select
                                    className="word-count-select"
                                    value={wordCount}
                                    onChange={(e) => setWordCount(Number(e.target.value))}
                                    disabled={isGenerating}
                                >
                                    <option value={10}>10 words</option>
                                    <option value={25}>25 words</option>
                                </select>
                            </div>

                            <button
                                className="generate-btn"
                                onClick={handleGenerate}
                                disabled={isGenerating}
                                title={isGenerating ? "Generating..." : "Generate vocabulary based on theme"}
                            >
                                {isGenerating ? 'Generating...' : 'Generate'}
                            </button>
                        </div>
                    </div>

                    <div className="translation-grid">
                        {editedTranslations.length > 0 && (
                            <div className="grid-header">
                                <div className="grid-cell">#</div>
                                <div className="grid-cell">
                                    {localeConfig[sourceLocale]?.displayName || sourceLocale}
                                </div>
                                <div className="grid-cell">
                                    {localeConfig[targetLocale]?.displayName || targetLocale}
                                </div>
                                <div className="grid-cell">Actions</div>
                            </div>
                        )}

                        {editedTranslations.map((pair, pairIndex) => (
                            <div key={pair.id} className={`grid-row ${editingId === pair.id ? 'editing' : ''}`}>
                                <div className="grid-cell row-number">{pairIndex + 1}</div>

                                {pair.translations.map((translation, localeIndex) => (
                                    <div key={`${pair.id}-${translation.locale}`} className="grid-cell translation-cell">
                                        <input
                                            type="text"
                                            className="translation-input"
                                            placeholder="Word/Phrase"
                                            value={translation.writingForm}
                                            onChange={(e) => handleUpdateTranslation(pair.id, localeIndex, 'writingForm', e.target.value)}
                                            onFocus={() => setEditingId(pair.id)}
                                        />
                                        {(translation.locale === 'zh-CN' || translation.locale === 'ja-JP' || translation.locale === 'ko-KR') && (
                                            <input
                                                type="text"
                                                className="translation-input reading"
                                                placeholder={
                                                    translation.locale === 'zh-CN' ? 'Pinyin (optional)' :
                                                        translation.locale === 'ja-JP' ? 'Hiragana/Romaji (optional)' :
                                                            'Romanization (optional)'
                                                }
                                                value={translation.readingForm || ''}
                                                onChange={(e) => handleUpdateTranslation(pair.id, localeIndex, 'readingForm', e.target.value)}
                                                onFocus={() => setEditingId(pair.id)}
                                            />
                                        )}
                                    </div>
                                ))}

                                <div className="grid-cell action-cell">
                                    <button
                                        className="delete-btn"
                                        onClick={() => handleDeleteTranslation(pair.id)}
                                        title="Delete translation"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="add-translation-btn" onClick={handleAddTranslation}>
                        + Add New {localeConfig[sourceLocale]?.displayName}-{localeConfig[targetLocale]?.displayName} Translation
                    </div>
                </div>

                <div className="modal-footer">
                    {!isSetupMode && (
                        <button className="modal-cancel-btn" onClick={handleCancel}>
                            Cancel
                        </button>
                    )}
                    <button className="modal-save-btn" onClick={handleSave} disabled={isGenerating}>
                        {isSetupMode ? '🚀 Start Game' : 'Save Changes'}
                    </button>
                </div>
            </div>

            {/* Language Change Confirmation Modal */}
            {showLanguageChangeConfirm && (
                <div className="confirm-overlay" onClick={cancelLanguageChange}>
                    <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
                        <div className="confirm-icon">⚠️</div>
                        <h3 className="confirm-title">Change Language?</h3>
                        <p className="confirm-message">
                            Changing the language will remove all existing translations ({editedTranslations.length} word{editedTranslations.length !== 1 ? 's' : ''}).
                            <br />
                            This action cannot be undone.
                        </p>
                        <div className="confirm-buttons">
                            <button className="confirm-cancel-btn" onClick={cancelLanguageChange}>
                                Cancel
                            </button>
                            <button className="confirm-delete-btn" onClick={confirmLanguageChange}>
                                Change & Clear All
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Generate Confirmation Modal */}
            {showGenerateConfirm && (
                <div className="confirm-overlay">
                    <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
                        <div className="confirm-icon">✨</div>
                        <h3 className="confirm-title">New Vocabulary Generated!</h3>
                        <p className="confirm-message">
                            Successfully generated {pendingGeneratedTranslations.length} new translation{pendingGeneratedTranslations.length !== 1 ? 's' : ''}.
                            <br /><br />
                            You currently have {editedTranslations.length} existing translation{editedTranslations.length !== 1 ? 's' : ''}.
                            <br />
                            What would you like to do?
                        </p>
                        <div className="confirm-buttons" style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                            <button
                                className="modal-save-btn"
                                onClick={handleAddGenerated}
                                style={{ width: '100%' }}
                            >
                                ➕ Add to Existing ({editedTranslations.length + pendingGeneratedTranslations.length} total)
                            </button>
                            <button
                                className="generate-btn"
                                onClick={handleReplaceGenerated}
                                style={{ width: '100%', background: '#dc2626' }}
                            >
                                🔄 Replace All ({pendingGeneratedTranslations.length} total)
                            </button>
                            <button
                                className="confirm-cancel-btn"
                                onClick={handleCancelGenerated}
                                style={{ width: '100%' }}
                            >
                                ✕ Cancel (Keep existing)
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};