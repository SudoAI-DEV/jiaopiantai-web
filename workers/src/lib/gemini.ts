const DEFAULT_BASE_URL = 'http://zx2.52youxi.cc:3000';

export interface GeminiClient {
  models: {
    generateContent(input: any): Promise<any>;
  };
}

let clientPromise: Promise<GeminiClient> | null = null;
let testClientFactory: (() => Promise<GeminiClient>) | null = null;

export async function createGeminiClient(): Promise<GeminiClient> {
  if (testClientFactory) {
    return testClientFactory();
  }

  if (!clientPromise) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }

    const baseUrl = process.env.GEMINI_BASE_URL || DEFAULT_BASE_URL;

    clientPromise = import('@google/genai').then(({ GoogleGenAI }) => {
      return new GoogleGenAI({
        apiKey,
        httpOptions: { baseUrl },
      }) as GeminiClient;
    });
  }

  return clientPromise;
}

export function resolveMimeType(filePath: string): string {
  const lower = filePath.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

export function setGeminiClientFactoryForTests(
  factory: (() => Promise<GeminiClient>) | null
): void {
  testClientFactory = factory;
  clientPromise = null;
}
