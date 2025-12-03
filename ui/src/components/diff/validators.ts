import { ReviewFile } from '../../types';

export const validateReviewFile = (file: ReviewFile): string | null => {
    if (!file) {
        return 'File object is missing';
    }
    if (!file.path) {
        return 'File path is missing';
    }
    if (typeof file.content !== 'string') {
        return 'File content must be a string';
    }
    // oldContent is optional, but if present should be string
    if (file.oldContent !== undefined && typeof file.oldContent !== 'string') {
        return 'Old content must be a string';
    }
    return null;
};
