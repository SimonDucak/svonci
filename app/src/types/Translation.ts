import type { LocaleCode } from "./LocaleCode";

export interface Translation {
    writingForm: string;
    readingForm?: string;
    locale: LocaleCode;
}
