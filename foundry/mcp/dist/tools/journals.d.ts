import { z } from "zod";
export declare const listJournalsInputSchema: {};
export declare function listJournalsHandler(_args?: Record<string, never>): Promise<{
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
export declare const createJournalInputSchema: {
    name: z.ZodString;
    content: z.ZodString;
    page_name: z.ZodDefault<z.ZodOptional<z.ZodString>>;
};
export declare function createJournalHandler(params: {
    name: string;
    content: string;
    page_name?: string;
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
export declare const deleteJournalInputSchema: {
    name: z.ZodString;
    confirm: z.ZodBoolean;
};
export declare function deleteJournalHandler(params: {
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
//# sourceMappingURL=journals.d.ts.map