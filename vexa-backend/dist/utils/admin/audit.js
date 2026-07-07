import prisma from '../../lib/prisma';
const getIpAddress = (req) => {
    if (!req)
        return undefined;
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.trim()) {
        return forwarded.split(',')[0].trim();
    }
    return req.ip || undefined;
};
export async function logAdminAction(params) {
    const { entityType, entityId, action, performedById, previousState, newState, req, } = params;
    await prisma.auditLog.create({
        data: {
            entityType,
            entityId,
            action,
            performedById,
            previousState: previousState ?? undefined,
            newState: newState ?? undefined,
            ipAddress: getIpAddress(req),
        },
    });
}
//# sourceMappingURL=audit.js.map