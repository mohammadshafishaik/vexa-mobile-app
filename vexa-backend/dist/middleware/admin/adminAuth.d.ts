import { Request, Response, NextFunction } from 'express';
import { AdminTokenPayload } from '../../utils/admin/jwt';
declare global {
    namespace Express {
        interface Request {
            admin?: AdminTokenPayload;
        }
    }
}
export declare function adminAuthMiddleware(req: Request, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=adminAuth.d.ts.map