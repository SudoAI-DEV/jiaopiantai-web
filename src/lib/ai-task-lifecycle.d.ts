export interface GenerationConfig {
    productConfigPath?: string;
    selectedImages?: string[];
    selectedImageNotes?: string[];
    modelImage?: string;
    customRequirements?: string[];
}
export declare class TaskLifecycleError extends Error {
    readonly status: number;
    constructor(message: string, status: number);
}
export declare function normalizeGenerationConfig(input: any): GenerationConfig | null;
export declare function submitProductToQueue(params: {
    productId: string;
    userId: string;
    generationConfig?: GenerationConfig | null;
}): Promise<{
    aiGenerationTaskId: string;
    productId: string;
    productStatus: "submitted";
}>;
export declare function cancelPendingProductTask(params: {
    productId: string;
    userId: string;
}): Promise<{
    aiGenerationTaskId: string;
    cancelledTaskCount: number;
    productId: string;
    productStatus: "cancelled";
}>;
