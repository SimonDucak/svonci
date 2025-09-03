import type { LocaleCode } from "./types/LocaleCode";
import type { LocaleConfig } from "./types/LocaleConfig";
import type { TranslationDataSet } from "./types/TranslationDataSet";

export const translationDataSet: TranslationDataSet = {
    locales: ['zh-CN', 'en-US'],
    pairs: [
        {
            id: 1,
            translations: [
                {
                    writingForm: '你好',
                    readingForm: 'nǐ hǎo',
                    locale: 'zh-CN'
                },
                {
                    writingForm: 'Hello',
                    locale: 'en-US'
                }
            ]
        },
        {
            id: 2,
            translations: [
                {
                    writingForm: '朋友',
                    readingForm: 'péng yǒu',
                    locale: 'zh-CN'
                },
                {
                    writingForm: 'Friend',
                    locale: 'en-US'
                }
            ]
        },
        {
            id: 3,
            translations: [
                {
                    writingForm: '学习',
                    readingForm: 'xué xí',
                    locale: 'zh-CN'
                },
                {
                    writingForm: 'Study/Learn',
                    locale: 'en-US'
                }
            ]
        },
        {
            id: 4,
            translations: [
                {
                    writingForm: '美丽',
                    readingForm: 'měi lì',
                    locale: 'zh-CN'
                },
                {
                    writingForm: 'Beautiful',
                    locale: 'en-US'
                }
            ]
        },
        {
            id: 5,
            translations: [
                {
                    writingForm: '家庭',
                    readingForm: 'jiā tíng',
                    locale: 'zh-CN'
                },
                {
                    writingForm: 'Family',
                    locale: 'en-US'
                }
            ]
        },
        {
            id: 6,
            translations: [
                {
                    writingForm: '谢谢',
                    readingForm: 'xiè xiè',
                    locale: 'zh-CN'
                },
                {
                    writingForm: 'Thank you',
                    locale: 'en-US'
                }
            ]
        },
        {
            id: 7,
            translations: [
                {
                    writingForm: '老师',
                    readingForm: 'lǎo shī',
                    locale: 'zh-CN'
                },
                {
                    writingForm: 'Teacher',
                    locale: 'en-US'
                }
            ]
        },
        {
            id: 8,
            translations: [
                {
                    writingForm: '学生',
                    readingForm: 'xué shēng',
                    locale: 'zh-CN'
                },
                {
                    writingForm: 'Student',
                    locale: 'en-US'
                }
            ]
        },
        {
            id: 9,
            translations: [
                {
                    writingForm: '水',
                    readingForm: 'shuǐ',
                    locale: 'zh-CN'
                },
                {
                    writingForm: 'Water',
                    locale: 'en-US'
                }
            ]
        },
        {
            id: 10,
            translations: [
                {
                    writingForm: '食物',
                    readingForm: 'shí wù',
                    locale: 'zh-CN'
                },
                {
                    writingForm: 'Food',
                    locale: 'en-US'
                }
            ]
        },
        {
            id: 11,
            translations: [
                {
                    writingForm: '书',
                    readingForm: 'shū',
                    locale: 'zh-CN'
                },
                {
                    writingForm: 'Book',
                    locale: 'en-US'
                }
            ]
        },
        {
            id: 12,
            translations: [
                {
                    writingForm: '爱',
                    readingForm: 'ài',
                    locale: 'zh-CN'
                },
                {
                    writingForm: 'Love',
                    locale: 'en-US'
                }
            ]
        },
        {
            id: 13,
            translations: [
                {
                    writingForm: '时间',
                    readingForm: 'shí jiān',
                    locale: 'zh-CN'
                },
                {
                    writingForm: 'Time',
                    locale: 'en-US'
                }
            ]
        },
        {
            id: 14,
            translations: [
                {
                    writingForm: '工作',
                    readingForm: 'gōng zuò',
                    locale: 'zh-CN'
                },
                {
                    writingForm: 'Work',
                    locale: 'en-US'
                }
            ]
        },
        {
            id: 15,
            translations: [
                {
                    writingForm: '钱',
                    readingForm: 'qián',
                    locale: 'zh-CN'
                },
                {
                    writingForm: 'Money',
                    locale: 'en-US'
                }
            ]
        },
        {
            id: 16,
            translations: [
                {
                    writingForm: '电话',
                    readingForm: 'diàn huà',
                    locale: 'zh-CN'
                },
                {
                    writingForm: 'Phone',
                    locale: 'en-US'
                }
            ]
        },
        {
            id: 17,
            translations: [
                {
                    writingForm: '汽车',
                    readingForm: 'qì chē',
                    locale: 'zh-CN'
                },
                {
                    writingForm: 'Car',
                    locale: 'en-US'
                }
            ]
        },
        {
            id: 18,
            translations: [
                {
                    writingForm: '房子',
                    readingForm: 'fáng zi',
                    locale: 'zh-CN'
                },
                {
                    writingForm: 'House',
                    locale: 'en-US'
                }
            ]
        },
        {
            id: 19,
            translations: [
                {
                    writingForm: '快乐',
                    readingForm: 'kuài lè',
                    locale: 'zh-CN'
                },
                {
                    writingForm: 'Happy',
                    locale: 'en-US'
                }
            ]
        },
        {
            id: 20,
            translations: [
                {
                    writingForm: '再见',
                    readingForm: 'zài jiàn',
                    locale: 'zh-CN'
                },
                {
                    writingForm: 'Goodbye',
                    locale: 'en-US'
                }
            ]
        }
    ]
};

export const localeConfig: Record<LocaleCode, LocaleConfig> = {
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