import type { LocaleCode } from "../types/LocaleCode";
import type { Translation } from "../types/Translation";
import type { TranslationPair } from "../types/TranslationPair";

export const getTranslationByLocale = (pair: TranslationPair, locale: LocaleCode): Translation | undefined => {
    return pair.translations.find(t => t.locale === locale);
};
