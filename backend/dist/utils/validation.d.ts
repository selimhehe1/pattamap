export declare const sanitizeInput: (input: string) => string;
export declare const escapeLikeWildcards: (input: string) => string;
export declare const validateAgainstSQLInjection: (input: string) => boolean;
export declare const validateTextInput: (input: string, minLength?: number, maxLength?: number, allowEmpty?: boolean) => {
    valid: boolean;
    sanitized?: string;
    error?: string;
};
export declare const validateNumericInput: (input: any, min?: number, max?: number) => {
    valid: boolean;
    value?: number;
    error?: string;
};
export declare const validateUUID: (input: string) => boolean;
export declare const validateEmail: (email: string) => boolean;
export declare const validateURL: (url: string) => boolean;
export declare const sanitizeInternalLink: (link: string | undefined | null) => string | null;
export declare const isValidExternalUrl: (url: string) => boolean;
export declare const validateUrlArray: (urls: string[] | undefined | null) => string[];
export declare const isValidImageUrl: (url: string) => boolean;
export declare const validateImageUrls: (urls: string[], minCount?: number, // Photos are optional by default
maxCount?: number) => {
    valid: boolean;
    error?: string;
};
export declare const escapeSQLString: (input: string) => string;
export declare const sanitizeErrorForClient: (error: any, context?: string) => string;
export declare const prepareFilterParams: (params: Record<string, any>) => Record<string, any>;
//# sourceMappingURL=validation.d.ts.map