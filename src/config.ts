export const DEFAULT_PORT = 3636;

export function getPort(): number {
    const envPort = process.env.REAGENT_PORT;
    if (!envPort) return DEFAULT_PORT;

    const parsed = Number.parseInt(envPort, 10);
    if (Number.isNaN(parsed)) {
        throw new Error(`Invalid REAGENT_PORT: ${envPort}`);
    }
    return parsed;
}
