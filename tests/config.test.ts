import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DEFAULT_PORT, getPort } from '@src/config.js';

describe('config', () => {
    const originalEnv = process.env.REAGENT_PORT;

    beforeEach(() => {
        delete process.env.REAGENT_PORT;
    });

    afterEach(() => {
        if (originalEnv) {
            process.env.REAGENT_PORT = originalEnv;
        } else {
            delete process.env.REAGENT_PORT;
        }
    });

    describe('DEFAULT_PORT', () => {
        it('is 3636', () => {
            expect(DEFAULT_PORT).toBe(3636);
        });
    });

    describe('getPort', () => {
        it('returns the default port when env is not set', () => {
            expect(getPort()).toBe(DEFAULT_PORT);
        });

        it('returns the env port when provided', () => {
            process.env.REAGENT_PORT = '4000';

            expect(getPort()).toBe(4000);
        });

        it('throws when env port is invalid', () => {
            process.env.REAGENT_PORT = 'invalid';

            expect(() => getPort()).toThrow('Invalid REAGENT_PORT: invalid');
        });
    });
});
