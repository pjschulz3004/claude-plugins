import { z } from "zod";
export declare const listScenesInputSchema: {};
export declare function listScenesHandler(_args?: Record<string, never>): Promise<{
    isError: true;
    content: {
        type: "text";
        text: string;
    }[];
} | {
    content: {
        type: "text";
        text: string;
    }[];
}>;
export declare const createSceneInputSchema: {
    name: z.ZodString;
    background: z.ZodOptional<z.ZodString>;
    width: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    height: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    grid_size: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    padding: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    active: z.ZodOptional<z.ZodBoolean>;
};
export declare function createSceneHandler(params: {
    name: string;
    background?: string;
    width?: number;
    height?: number;
    grid_size?: number;
    padding?: number;
    active?: boolean;
}): Promise<{
    isError: true;
    content: {
        type: "text";
        text: string;
    }[];
} | {
    content: {
        type: "text";
        text: string;
    }[];
}>;
export declare const deleteSceneInputSchema: {
    name: z.ZodString;
    confirm: z.ZodBoolean;
};
export declare function deleteSceneHandler(params: {
    name: string;
    confirm: boolean;
}): Promise<{
    isError: true;
    content: {
        type: "text";
        text: string;
    }[];
} | {
    content: {
        type: "text";
        text: string;
    }[];
}>;
//# sourceMappingURL=scenes.d.ts.map