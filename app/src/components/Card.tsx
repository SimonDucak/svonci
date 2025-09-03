import React from 'react';
import type { TranslationPair } from '../types/TranslationPair';
import type { Translation } from '../types/Translation';

interface CardProps {
    item: TranslationPair;
    translation: Translation | undefined;
    index: number;
    isSelected: boolean;
    isMatched: boolean;
    keyHint: string;
    isChineseCard?: boolean;
    supportsPronunciation?: boolean;
    onClick: (item: TranslationPair) => void;
}

export const Card: React.FC<CardProps> = ({
    item,
    translation,
    isSelected,
    isMatched,
    keyHint,
    isChineseCard = false,
    supportsPronunciation = false,
    onClick
}) => {
    if (!translation) return null;

    return (
        <div
            className={`card ${isSelected ? 'selected' : ''} ${isMatched ? 'matched' : ''}`}
            onClick={() => onClick(item)}
        >
            <div className="card-key-hint">{keyHint.toUpperCase()}</div>
            <div className={`card-writing ${isChineseCard ? 'chinese' : ''}`}>
                {translation.writingForm}
            </div>
            {translation.readingForm && (
                <div className="card-reading">
                    {translation.readingForm}
                </div>
            )}
            <div className="card-hint">
                {isMatched ? '✓ Matched' : supportsPronunciation ? '🔊 Click me' : 'Select'}
            </div>
        </div>
    );
};