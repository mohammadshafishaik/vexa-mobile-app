export interface EmailSendResult {
    success: boolean;
    messageId?: string;
    error?: string;
}
export declare function isEmailConfigured(): boolean;
export declare function verifyEmailTransport(): Promise<void>;
export declare function verifyResendFromDomain(domain?: string): Promise<{
    verified: boolean;
    domain?: string;
    status?: string;
    error?: string;
}>;
export declare function sendWelcomeEmail(to: string, name: string): Promise<EmailSendResult>;
export declare function sendLoginOtpEmail(to: string, name: string, code: string): Promise<EmailSendResult>;
export declare function sendEmailVerificationEmail(to: string, name: string, code: string, token: string): Promise<EmailSendResult>;
export declare function sendPasswordResetEmail(to: string, resetToken: string): Promise<EmailSendResult>;
export declare function sendJobPostedEmail(to: string, data: {
    name: string;
    jobTitle: string;
    orderId: string;
    category: string;
    location: string;
}): Promise<EmailSendResult>;
export declare function sendProviderSelectedEmail(to: string, data: {
    providerName: string;
    jobTitle: string;
    orderId: string;
    customerName: string;
    amount: string;
    scheduledAt?: string;
}): Promise<EmailSendResult>;
export declare function sendBidReceivedEmail(to: string, data: {
    customerName: string;
    jobTitle: string;
    orderId: string;
    providerName: string;
    bidAmount: string;
    estimatedDuration: string;
}): Promise<EmailSendResult>;
export declare function sendModificationRequestEmail(to: string, data: {
    customerName: string;
    jobTitle: string;
    orderId: string;
    originalPrice: string;
    revisedPrice: string;
    reason: string;
}): Promise<EmailSendResult>;
export declare function sendPaymentSuccessEmail(to: string, data: {
    name: string;
    jobTitle: string;
    orderId: string;
    amount: string;
    gst: string;
    commission: string;
    total: string;
    paymentId: string;
}): Promise<EmailSendResult>;
export declare function sendEscrowReleasedEmail(to: string, data: {
    providerName: string;
    jobTitle: string;
    orderId: string;
    amount: string;
    platformFee: string;
    payout: string;
}): Promise<EmailSendResult>;
export declare function sendDisputeUpdateEmail(to: string, data: {
    name: string;
    jobTitle: string;
    orderId: string;
    disputeStatus: string;
    updateMessage: string;
}): Promise<EmailSendResult>;
export declare function sendRatingReminderEmail(to: string, data: {
    name: string;
    jobTitle: string;
    orderId: string;
    providerName: string;
}): Promise<EmailSendResult>;
//# sourceMappingURL=resend.d.ts.map