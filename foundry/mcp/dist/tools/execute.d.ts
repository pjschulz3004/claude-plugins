import { z } from "zod";
export declare const executeJsInputSchema: {
    script: z.ZodString;
};
export declare function executeJsHandler(params: {
    script: string;
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
//# sourceMappingURL=execute.d.ts.map