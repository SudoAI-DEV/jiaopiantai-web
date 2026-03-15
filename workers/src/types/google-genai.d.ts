declare module '@google/genai' {
  export class GoogleGenAI {
    constructor(config: any);
    models: {
      generateContent(input: any): Promise<any>;
    };
  }
}
