import { z } from "zod";
export declare const listPlaylistsInputSchema: {};
export declare function listPlaylistsHandler(_args?: Record<string, never>): Promise<{
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
export declare const createPlaylistInputSchema: {
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    sounds: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        path: z.ZodString;
        repeat: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        volume: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        path: string;
        name: string;
        repeat: boolean;
        volume: number;
    }, {
        path: string;
        name: string;
        repeat?: boolean | undefined;
        volume?: number | undefined;
    }>, "many">>;
};
export declare function createPlaylistHandler(params: {
    name: string;
    description?: string;
    sounds?: Array<{
        name: string;
        path: string;
        repeat?: boolean;
        volume?: number;
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
export declare const assignPlaylistInputSchema: {
    playlist_name: z.ZodString;
    scene_name: z.ZodString;
};
export declare function assignPlaylistHandler(params: {
    playlist_name: string;
    scene_name: string;
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
export declare const deletePlaylistInputSchema: {
    name: z.ZodString;
    confirm: z.ZodBoolean;
};
export declare function deletePlaylistHandler(params: {
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
//# sourceMappingURL=playlists.d.ts.map