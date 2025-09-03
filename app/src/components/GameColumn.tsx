import React from 'react';
import type { TranslationPair } from '../types/TranslationPair';
import type { LocaleCode } from '../types/LocaleCode';
import { Card } from './Card';
import { getTranslationByLocale } from '../utils/locale';
import type { LocaleConfig } from '../types/LocaleConfig';

interface GameColumnProps {
    title: string;
    items: TranslationPair[];
    locale: LocaleCode;
    localeConfig: LocaleConfig;
    selectedItem: TranslationPair | null;
    matchedPairs: number[];
    keyMappings: string[];
    currentBatchIndex: number;
    onItemClick: (item: TranslationPair) => void;
}

export const GameColumn: React.FC<GameColumnProps> = ({
    title,
    items,
    locale,
    localeConfig,
    selectedItem,
    matchedPairs,
    keyMappings,
    currentBatchIndex,
    onItemClick
}) => {
    const isChineseColumn = locale === 'zh-CN';

    return (
        <div className="column">
            <h2 className="column-header">{title}</h2>
            <div className="cards-container">
                {items.map((item, index) => {
                    const translation = getTranslationByLocale(item, locale);
                    const isSelected = selectedItem?.id === item.id;
                    const isMatched = matchedPairs.includes(item.id);

                    return (
                        <Card
                            key={`${locale}-${currentBatchIndex}-${index}`}
                            item={item}
                            translation={translation}
                            index={index}
                            isSelected={isSelected}
                            isMatched={isMatched}
                            keyHint={keyMappings[index]}
                            isChineseCard={isChineseColumn}
                            supportsPronunciation={localeConfig.supportsPronunciation}
                            onClick={onItemClick}
                        />
                    );
                })}
            </div>
        </div>
    );
};