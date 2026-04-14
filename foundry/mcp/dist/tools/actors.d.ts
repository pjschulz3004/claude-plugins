import { z } from "zod";
export declare const listActorsInputSchema: {
    type: z.ZodOptional<z.ZodEnum<["character", "threat", "crew"]>>;
};
export declare function listActorsHandler({ type, }: {
    type?: "character" | "threat" | "crew";
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
export declare const createActorInputSchema: {
    name: z.ZodString;
    type: z.ZodDefault<z.ZodEnum<["character", "threat", "crew"]>>;
    alias: z.ZodOptional<z.ZodString>;
    mythos: z.ZodOptional<z.ZodString>;
    logos: z.ZodOptional<z.ZodString>;
    short_description: z.ZodOptional<z.ZodString>;
    img: z.ZodOptional<z.ZodString>;
    themes: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        subtype: z.ZodEnum<["Mythos", "Logos"]>;
        mystery: z.ZodOptional<z.ZodString>;
        power_tags: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            question: z.ZodOptional<z.ZodString>;
            question_letter: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            question?: string | undefined;
            question_letter?: string | undefined;
        }, {
            name: string;
            question?: string | undefined;
            question_letter?: string | undefined;
        }>, "many">>;
        weakness_tags: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            question: z.ZodOptional<z.ZodString>;
            question_letter: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            question?: string | undefined;
            question_letter?: string | undefined;
        }, {
            name: string;
            question?: string | undefined;
            question_letter?: string | undefined;
        }>, "many">>;
        gm_moves: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            subtype: z.ZodDefault<z.ZodEnum<["soft", "hard"]>>;
            description: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            subtype: "soft" | "hard";
            description?: string | undefined;
        }, {
            name: string;
            subtype?: "soft" | "hard" | undefined;
            description?: string | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        subtype: "Mythos" | "Logos";
        mystery?: string | undefined;
        power_tags?: {
            name: string;
            question?: string | undefined;
            question_letter?: string | undefined;
        }[] | undefined;
        weakness_tags?: {
            name: string;
            question?: string | undefined;
            question_letter?: string | undefined;
        }[] | undefined;
        gm_moves?: {
            name: string;
            subtype: "soft" | "hard";
            description?: string | undefined;
        }[] | undefined;
    }, {
        name: string;
        subtype: "Mythos" | "Logos";
        mystery?: string | undefined;
        power_tags?: {
            name: string;
            question?: string | undefined;
            question_letter?: string | undefined;
        }[] | undefined;
        weakness_tags?: {
            name: string;
            question?: string | undefined;
            question_letter?: string | undefined;
        }[] | undefined;
        gm_moves?: {
            name: string;
            subtype?: "soft" | "hard" | undefined;
            description?: string | undefined;
        }[] | undefined;
    }>, "many">>;
};
export declare function createActorHandler(params: {
    name: string;
    type?: "character" | "threat" | "crew";
    alias?: string;
    mythos?: string;
    logos?: string;
    short_description?: string;
    img?: string;
    themes?: Array<{
        name: string;
        subtype: "Mythos" | "Logos";
        mystery?: string;
        power_tags?: Array<{
            name: string;
            question?: string;
            question_letter?: string;
        }>;
        weakness_tags?: Array<{
            name: string;
            question?: string;
            question_letter?: string;
        }>;
        gm_moves?: Array<{
            name: string;
            subtype?: "soft" | "hard";
            description?: string;
        }>;
    }>;
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
export declare const updateActorInputSchema: {
    name: z.ZodString;
    updates: z.ZodRecord<z.ZodString, z.ZodUnknown>;
};
export declare function updateActorHandler(params: {
    name: string;
    updates: Record<string, unknown>;
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
export declare const deleteActorInputSchema: {
    name: z.ZodString;
    confirm: z.ZodBoolean;
};
export declare function deleteActorHandler(params: {
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
//# sourceMappingURL=actors.d.ts.map