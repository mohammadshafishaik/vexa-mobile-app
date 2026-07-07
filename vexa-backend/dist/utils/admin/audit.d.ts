import { Request } from 'express';
interface LogAdminActionParams {
    entityType: string;
    entityId: string;
    action: string;
    performedById: string;
    previousState?: unknown;
    newState?: unknown;
    req?: Request;
}
export declare function logAdminAction(params: LogAdminActionParams): Promise<void>;
export {};
//# sourceMappingURL=audit.d.ts.map