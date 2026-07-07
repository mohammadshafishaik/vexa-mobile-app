const roleRank = {
    MODERATOR: 1,
    SUPER_ADMIN: 2,
};
export function requireAdminRole(allowedRoles) {
    return (req, res, next) => {
        if (!req.admin?.adminRole) {
            res.status(401).json({ success: false, message: 'Admin authentication required' });
            return;
        }
        const currentRole = req.admin.adminRole;
        const hasAccess = allowedRoles.some((role) => roleRank[currentRole] >= roleRank[role]);
        if (!hasAccess) {
            res.status(403).json({ success: false, message: 'Insufficient admin permissions' });
            return;
        }
        next();
    };
}
//# sourceMappingURL=requireAdminRole.js.map