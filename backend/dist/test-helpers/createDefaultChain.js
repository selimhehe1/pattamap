"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDefaultChain = void 0;
/**
 * Default chainable mock for Supabase queries
 * This creates a mock that supports any chain order (select().order().eq() or select().eq().order())
 */
const createDefaultChain = (finalData = { data: [], error: null }) => {
    const chain = {
        _finalData: finalData
    };
    // All chainable methods
    const chainMethods = ['select', 'eq', 'or', 'order', 'range', 'limit', 'update', 'insert', 'delete', 'is', 'ilike', 'gte', 'in', 'neq', 'contains'];
    chainMethods.forEach(method => {
        chain[method] = jest.fn((...args) => {
            // Special handling for .select() with count option
            if (method === 'select' && args[1]?.count === 'exact') {
                // Return Promise for count queries
                const data = chain._finalData.data;
                return Promise.resolve({
                    count: Array.isArray(data) ? data.length : 0,
                    error: chain._finalData.error
                });
            }
            return chain; // Continue chaining
        });
    });
    // .single() returns Promise
    chain.single = jest.fn(() => {
        const data = chain._finalData.data;
        const error = chain._finalData.error;
        if (Array.isArray(data)) {
            if (data.length === 0) {
                return Promise.resolve({
                    data: null,
                    error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' }
                });
            }
            else if (data.length === 1) {
                return Promise.resolve({ data: data[0], error: null });
            }
            else {
                return Promise.resolve({
                    data: null,
                    error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' }
                });
            }
        }
        return Promise.resolve({ data, error });
    });
    // Make chain itself awaitable - REAL Promise
    chain.then = function (resolve, reject) {
        return Promise.resolve(chain._finalData).then(resolve, reject);
    };
    chain.catch = function (reject) {
        return Promise.resolve(chain._finalData).catch(reject);
    };
    return chain;
};
exports.createDefaultChain = createDefaultChain;
//# sourceMappingURL=createDefaultChain.js.map