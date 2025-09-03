import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { TranslationModal } from '../components/TranslationModal';
import type { LocaleCode } from '../types/LocaleCode';
import type { TranslationPair } from '../types/TranslationPair';
import type { LocaleConfig } from '../types/LocaleConfig';
import { getBaseApiUrl } from '../api';

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

export default function AddGamePage(): JSX.Element {
    const navigate = useNavigate();
    const [isCreating, setIsCreating] = useState(false);

    const handleCreateGame = async (
        translations: TranslationPair[],
        locales: LocaleCode[],
        gameName?: string
    ) => {
        try {
            setIsCreating(true);

            // Create game in backend
            const response = await fetch(`${getBaseApiUrl()}/api/games`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: gameName || `${localeConfig[locales[0]]?.displayName}-${localeConfig[locales[1]]?.displayName} Vocabulary`,
                    sourceLocale: locales[0],
                    targetLocale: locales[1],
                    translations: translations
                })
            });

            if (!response.ok) {
                throw new Error('Failed to create game');
            }

            const result = await response.json();
            console.log('Game created:', result.data);

            // Navigate to the game page with the new game ID
            navigate(`/game/${result.data.id}`);
        } catch (error) {
            console.error('Error creating game:', error);
            alert('Failed to create game. Please try again.');
            setIsCreating(false);
        }
    };

    return (
        <div className="app-container">
            <div className="setup-container">
                <h1 className="title">✨ Translation Match ✨</h1>
                <p className="setup-subtitle">Create your vocabulary game to start learning!</p>

                <div className="home-navigation">
                    <Link to="/games" className="view-games-link">
                        📚 View All Games
                    </Link>
                </div>

                <TranslationModal
                    isOpen={true}
                    onClose={() => {
                        // Can't close on home page
                    }}
                    translations={[]}
                    onUpdateTranslations={(translations, newLocales) => {
                        if (newLocales) {
                            const gameName = prompt(
                                'Enter a name for your game:',
                                `${localeConfig[newLocales[0]]?.displayName}-${localeConfig[newLocales[1]]?.displayName} Vocabulary`
                            );
                            handleCreateGame(translations, newLocales, gameName || undefined);
                        }
                    }}
                    locales={['zh-CN', 'en-US']}
                    isSetupMode={true}
                    availableLocales={AVAILABLE_LOCALES}
                    localeConfig={localeConfig}
                />

                {isCreating && (
                    <div className="loading-overlay">
                        <div className="loader">
                            <div className="loader-spinner"></div>
                            <div className="loader-text">Creating game...</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}