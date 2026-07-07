export declare const DEFAULT_ADMIN_EMAIL = "superadmin@vexa.app";
export declare const DEFAULT_ADMIN_PASSWORD = "Admin@12345";
export declare const DEFAULT_ADMIN_NAME = "VEXA Super Admin";
export type UpsertSuperAdminInput = {
    email: string;
    password: string;
    name: string;
};
export declare const resolveSuperAdminInput: (values?: Partial<UpsertSuperAdminInput>) => UpsertSuperAdminInput;
export declare const upsertSuperAdmin: (values?: Partial<UpsertSuperAdminInput>) => Promise<{
    id: string;
    name: string;
    email: string;
    role: import("@prisma/client").$Enums.UserRole;
    accountStatus: import("@prisma/client").$Enums.AccountStatus;
    adminRole: never;
}>;
//# sourceMappingURL=superAdmin.d.ts.map