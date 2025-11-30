import { CommentableBlock } from './CommentableBlock';

const createComponent = (Tag: any) => (props: any) => (
    <CommentableBlock {...props}>
        <Tag {...props} />
    </CommentableBlock>
);

export const markdownComponents = {
    p: createComponent('p'),
    h1: createComponent('h1'),
    h2: createComponent('h2'),
    h3: createComponent('h3'),
    h4: createComponent('h4'),
    h5: createComponent('h5'),
    h6: createComponent('h6'),
    li: createComponent('li'),
    blockquote: createComponent('blockquote'),
    pre: createComponent('pre'),
};
