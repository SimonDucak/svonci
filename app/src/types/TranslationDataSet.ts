import type { LocaleCode } from "./LocaleCode";
import type { TranslationPair } from "./TranslationPair";

export interface TranslationDataSet {
    locales: LocaleCode[];
    pairs: TranslationPair[];
}