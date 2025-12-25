/**
 * Mock Supabase Client for Testing
 * Provides a chainable mock interface matching Supabase's API
 */
export declare const supabase: {
    from: jest.Mock<{
        select: jest.Mock<any, any, any>;
        insert: jest.Mock<any, any, any>;
        update: jest.Mock<any, any, any>;
        delete: jest.Mock<any, any, any>;
        eq: jest.Mock<any, any, any>;
        neq: jest.Mock<any, any, any>;
        in: jest.Mock<any, any, any>;
        is: jest.Mock<any, any, any>;
        gte: jest.Mock<any, any, any>;
        lte: jest.Mock<any, any, any>;
        like: jest.Mock<any, any, any>;
        ilike: jest.Mock<any, any, any>;
        match: jest.Mock<any, any, any>;
        order: jest.Mock<any, any, any>;
        limit: jest.Mock<any, any, any>;
        range: jest.Mock<any, any, any>;
        single: jest.Mock<any, any, any>;
        maybeSingle: jest.Mock<any, any, any>;
        filter: jest.Mock<any, any, any>;
        or: jest.Mock<any, any, any>;
        not: jest.Mock<any, any, any>;
        contains: jest.Mock<any, any, any>;
        containedBy: jest.Mock<any, any, any>;
        overlaps: jest.Mock<any, any, any>;
        textSearch: jest.Mock<any, any, any>;
        then: jest.Mock<any, [resolve: any], any>;
    }, [table: string], any>;
    auth: {
        signUp: jest.Mock<any, any, any>;
        signInWithPassword: jest.Mock<any, any, any>;
        signOut: jest.Mock<any, any, any>;
        getUser: jest.Mock<any, any, any>;
        getSession: jest.Mock<any, any, any>;
    };
    storage: {
        from: jest.Mock<{
            upload: jest.Mock<any, any, any>;
            download: jest.Mock<any, any, any>;
            remove: jest.Mock<any, any, any>;
            list: jest.Mock<any, any, any>;
            getPublicUrl: jest.Mock<any, any, any>;
        }, [], any>;
    };
    rpc: jest.Mock<any, any, any>;
    __setMockData: (data: any) => void;
    __setMockError: (error: any) => void;
};
export declare const supabaseClient: {
    from: jest.Mock<{
        select: jest.Mock<any, any, any>;
        insert: jest.Mock<any, any, any>;
        update: jest.Mock<any, any, any>;
        delete: jest.Mock<any, any, any>;
        eq: jest.Mock<any, any, any>;
        neq: jest.Mock<any, any, any>;
        in: jest.Mock<any, any, any>;
        is: jest.Mock<any, any, any>;
        gte: jest.Mock<any, any, any>;
        lte: jest.Mock<any, any, any>;
        like: jest.Mock<any, any, any>;
        ilike: jest.Mock<any, any, any>;
        match: jest.Mock<any, any, any>;
        order: jest.Mock<any, any, any>;
        limit: jest.Mock<any, any, any>;
        range: jest.Mock<any, any, any>;
        single: jest.Mock<any, any, any>;
        maybeSingle: jest.Mock<any, any, any>;
        filter: jest.Mock<any, any, any>;
        or: jest.Mock<any, any, any>;
        not: jest.Mock<any, any, any>;
        contains: jest.Mock<any, any, any>;
        containedBy: jest.Mock<any, any, any>;
        overlaps: jest.Mock<any, any, any>;
        textSearch: jest.Mock<any, any, any>;
        then: jest.Mock<any, [resolve: any], any>;
    }, [table: string], any>;
    auth: {
        signUp: jest.Mock<any, any, any>;
        signInWithPassword: jest.Mock<any, any, any>;
        signOut: jest.Mock<any, any, any>;
        getUser: jest.Mock<any, any, any>;
        getSession: jest.Mock<any, any, any>;
    };
    storage: {
        from: jest.Mock<{
            upload: jest.Mock<any, any, any>;
            download: jest.Mock<any, any, any>;
            remove: jest.Mock<any, any, any>;
            list: jest.Mock<any, any, any>;
            getPublicUrl: jest.Mock<any, any, any>;
        }, [], any>;
    };
    rpc: jest.Mock<any, any, any>;
    __setMockData: (data: any) => void;
    __setMockError: (error: any) => void;
};
export declare const mockSupabaseResponse: (data: any, error?: any) => {
    data: any;
    error: any;
};
export declare const resetSupabaseMocks: () => void;
//# sourceMappingURL=supabase.d.ts.map