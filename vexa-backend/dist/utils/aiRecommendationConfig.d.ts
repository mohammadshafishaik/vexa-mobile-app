export type AiRecommendationConfig = {
    bidUndercutPercent: number;
    bidMinimumUndercut: number;
    minProposalLength: number;
    minJobDescriptionLength: number;
    chatSuggestionCount: number;
    requireSafetyNote: boolean;
    includeExperienceLineInBid: boolean;
};
export declare const mergeAiRecommendationConfig: (current: AiRecommendationConfig, patch: unknown) => AiRecommendationConfig;
export declare const clearAiRecommendationConfigCache: () => void;
export declare const getAiRecommendationConfig: (forceRefresh?: boolean) => Promise<AiRecommendationConfig>;
export declare const getAiRecommendationConfigWithMeta: (forceRefresh?: boolean) => Promise<{
    config: AiRecommendationConfig;
    updatedAt: string | null;
}>;
export declare const getAiRecommendationConfigAuditIdentity: () => {
    entityType: string;
    entityId: string;
    action: string;
};
//# sourceMappingURL=aiRecommendationConfig.d.ts.map