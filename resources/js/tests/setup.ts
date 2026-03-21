import '@testing-library/jest-dom/vitest';

// ── QZ Tray mock ──────────────────────────────────────────────────
vi.mock('@/services/qzTray', () => ({
    connectQZ: vi.fn().mockResolvedValue(undefined),
    isConnected: vi.fn().mockResolvedValue(false),
    listPrinters: vi.fn().mockResolvedValue(['POS-58', 'PDF']),
    printReceipt: vi.fn().mockResolvedValue(undefined),
    printReturn: vi.fn().mockResolvedValue(undefined),
    printCashSession: vi.fn().mockResolvedValue(undefined),
    printTest: vi.fn().mockResolvedValue(undefined),
}));

// ── AudioContext stub ─────────────────────────────────────────────
const oscillatorNode = {
    type: 'sine' as OscillatorType,
    frequency: { value: 0 },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
};

const gainNode = {
    gain: { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
};

class MockAudioContext {
    currentTime = 0;
    destination = {};
    createOscillator() {
        return oscillatorNode;
    }
    createGain() {
        return gainNode;
    }
}

vi.stubGlobal('AudioContext', MockAudioContext);

// ── localStorage stub ─────────────────────────────────────────────
const store: Record<string, string> = {};

const localStorageMock: Storage = {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
        delete store[key];
    }),
    clear: vi.fn(() => {
        for (const k of Object.keys(store)) delete store[k];
    }),
    get length() {
        return Object.keys(store).length;
    },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
};

vi.stubGlobal('localStorage', localStorageMock);

// ── @inertiajs/react mock ─────────────────────────────────────────
vi.mock('@inertiajs/react', () => ({
    router: {
        post: vi.fn(),
        get: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
        visit: vi.fn(),
    },
    usePage: vi.fn(() => ({ props: {} })),
    Link: 'a',
}));

// ── react-hot-toast mock ──────────────────────────────────────────
vi.mock('react-hot-toast', () => ({
    default: Object.assign(vi.fn(), {
        success: vi.fn(),
        error: vi.fn(),
    }),
}));
