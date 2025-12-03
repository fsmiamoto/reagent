import { useMemo } from 'react';
import { diffLines } from 'diff';
import { tokenizeToLines } from '../lib/prism';
import { inferLanguage } from '../utils/language';

export interface DiffRow {
    type: 'added' | 'removed' | 'unchanged';
    content: string;
    oldLineNumber?: number;
    newLineNumber?: number;
}

interface UseDiffOptions {
    oldContent?: string;
    newContent: string;
    filePath: string;
    language?: string;
}

export const useDiff = ({ oldContent = '', newContent, filePath, language }: UseDiffOptions) => {
    const { oldTokens, newTokens } = useMemo(() => {
        const lang = inferLanguage(filePath, language);

        return {
            oldTokens: tokenizeToLines(oldContent, lang),
            newTokens: tokenizeToLines(newContent, lang),
        };
    }, [newContent, oldContent, language, filePath]);

    const diffRows = useMemo(() => {
        const changes = diffLines(oldContent, newContent);
        const rows: DiffRow[] = [];
        let oldLine = 1;
        let newLine = 1;

        changes.forEach((change) => {
            if (change.count === 0) return;
            const lines = change.value.replace(/\n$/, '').split('\n');

            lines.forEach((line) => {
                if (change.added) {
                    rows.push({
                        type: 'added',
                        content: line,
                        newLineNumber: newLine++,
                    });
                } else if (change.removed) {
                    rows.push({
                        type: 'removed',
                        content: line,
                        oldLineNumber: oldLine++,
                    });
                } else {
                    rows.push({
                        type: 'unchanged',
                        content: line,
                        oldLineNumber: oldLine++,
                        newLineNumber: newLine++,
                    });
                }
            });
        });

        return rows;
    }, [newContent, oldContent]);

    return {
        oldTokens,
        newTokens,
        diffRows,
    };
};
