import { Request, Response } from 'express';
export declare const createProposal: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getProposals: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getMyProposals: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const approveProposal: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const rejectProposal: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=editProposalController.d.ts.map