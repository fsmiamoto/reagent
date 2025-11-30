import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-java';

export type Token = {
    type: string;
    content: string;
};

const fallbackTokenization = (code: string): Token[][] => {
    // Handles languages that are not registered or when no language is provided
    return code.split('\n').map(line => [{ type: 'text', content: line }]);
};

export const tokenizeToLines = (code: string, language?: string): Token[][] => {
    if (!language || !Prism.languages[language]) {
        return fallbackTokenization(code);
    }

    const tokens = Prism.tokenize(code, Prism.languages[language]);
    const lines: Token[][] = [];
    let currentLine: Token[] = [];

    const addToken = (token: Prism.Token | string) => {
        if (typeof token === 'string') {
            const parts = token.split('\n');
            parts.forEach((part, index) => {
                if (index > 0) {
                    lines.push(currentLine);
                    currentLine = [];
                }
                if (part) {
                    currentLine.push({ type: 'text', content: part });
                }
            });
        } else {
            const content = Prism.Token.stringify(token.content, language);
            const parts = content.split('\n');
            parts.forEach((part, index) => {
                if (index > 0) {
                    lines.push(currentLine);
                    currentLine = [];
                }
                if (part) {
                    currentLine.push({ type: token.type, content: part });
                }
            });
        }
    };

    tokens.forEach(addToken);
    lines.push(currentLine);

    return lines;
};
