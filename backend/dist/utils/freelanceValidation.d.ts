/**
 * Freelance Validation Utilities
 * Version: 10.3
 *
 * Validates freelance business logic:
 * - Freelances can ONLY be associated with Nightclubs
 * - Freelances can have MULTIPLE nightclub associations simultaneously
 * - Regular employees can only have ONE current establishment
 */
/**
 * Validates that an establishment is a Nightclub
 * @param establishmentId - The establishment ID to validate
 * @returns Promise<{ isNightclub: boolean, categoryName: string | null, error: string | null }>
 */
export declare function validateEstablishmentIsNightclub(establishmentId: string): Promise<{
    isNightclub: boolean;
    categoryName: string | null;
    error: string | null;
}>;
/**
 * Validates that all establishment IDs are Nightclubs (for freelance multi-association)
 * @param establishmentIds - Array of establishment IDs to validate
 * @returns Promise<{ valid: boolean, invalidEstablishments: Array<{id: string, name: string, category: string}>, error: string | null }>
 */
export declare function validateAllEstablishmentsAreNightclubs(establishmentIds: string[]): Promise<{
    valid: boolean;
    invalidEstablishments: Array<{
        id: string;
        name: string;
        category: string;
    }>;
    error: string | null;
}>;
/**
 * Validates freelance business rules for employee update/create
 * @param employeeId - The employee ID (null for create)
 * @param isFreelance - Whether the employee is a freelance
 * @param establishmentIds - Array of establishment IDs to associate (for freelances)
 * @returns Promise<{ valid: boolean, error: string | null }>
 */
export declare function validateFreelanceRules(employeeId: string | null, isFreelance: boolean, establishmentIds?: string[]): Promise<{
    valid: boolean;
    error: string | null;
}>;
/**
 * Get current nightclub associations for a freelance employee
 * @param employeeId - The employee ID
 * @returns Promise<string[]> - Array of establishment IDs
 */
export declare function getFreelanceNightclubs(employeeId: string): Promise<string[]>;
//# sourceMappingURL=freelanceValidation.d.ts.map