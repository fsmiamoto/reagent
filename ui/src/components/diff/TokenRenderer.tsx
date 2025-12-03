import { type FC } from 'react';
import { type Token } from '../../lib/prism';

interface TokenRendererProps {
    token: Token;
}

export const TokenRenderer: FC<TokenRendererProps> = ({ token }) => {
    const className = token.types.length > 1 || token.types[0] !== 'text'
        ? `token ${token.types.join(' ')}`
        : undefined;

    return (
        <span className={className}>
            {token.content}
        </span>
    );
};
