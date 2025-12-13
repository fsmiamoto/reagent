import { type FC } from 'react';
import { cn } from '../../lib/utils';
import { Token } from '../../lib/prism';
import { TokenRenderer } from './TokenRenderer';

interface CodeLineProps {
    content: string;
    tokens?: Token[];
    className?: string;
}

export const CodeLine: FC<CodeLineProps> = ({ content, tokens, className }) => {
    return (
        <code className={cn("font-mono whitespace-pre block min-w-full", className)}>
            {tokens?.map((token, i) => (
                <TokenRenderer key={i} token={token} />
            )) || content || ' '}
        </code>
    );
};
