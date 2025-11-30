export const inferLanguage = (fileName: string, language?: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (language) return language.toLowerCase();
    if (ext === 'ts' || ext === 'tsx') return 'typescript';
    if (ext === 'js' || ext === 'jsx') return 'javascript';
    if (ext === 'md') return 'markdown';
    if (ext === 'py') return 'python';
    if (ext === 'rs') return 'rust';
    return ext;
};
