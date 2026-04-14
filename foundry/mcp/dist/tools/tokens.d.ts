import { z } from "zod";
export declare const placeTokenInputSchema: {
    scene_name: z.ZodString;
    actor_name: z.ZodString;
    x: z.ZodNumber;
    y: z.ZodNumber;
    width: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    height: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
};
export declare function placeTokenHandler(params: {
    scene_name: string;
    actor_name: string;
    x: number;
    y: number;
    width?: number;
    height?: number;
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
//# sourceMappingURL=tokens.d.ts.map