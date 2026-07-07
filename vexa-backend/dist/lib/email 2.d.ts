import nodemailer from 'nodemailer';
declare let transporter: nodemailer.Transporter | null;
export declare function isEmailConfigured(): boolean;
export declare function verifyEmailTransport(): Promise<void>;
export declare function sendPasswordResetEmail(to: string, resetToken: string): Promise<boolean>;
export default transporter;
//# sourceMappingURL=email%202.d.ts.map