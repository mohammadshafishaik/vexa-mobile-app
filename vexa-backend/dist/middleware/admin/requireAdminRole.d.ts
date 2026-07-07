import { Request, Response, NextFunction } from 'express';
export declare function requireAdminRole(allowedRoles: Array<'SUPER_ADMIN' | 'MODERATOR'>): (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=requireAdminRole.d.ts.map