type JobRecommendationInput = {
    title?: string;
    description?: string;
    category?: string;
    location?: string;
    budget?: number;
    urgency?: string;
};
type BidRecommendationInput = {
    jobTitle?: string;
    jobDescription?: string;
    jobCategory?: string;
    currentLowestBid?: number;
    myBidAmount?: number;
    estimatedDuration?: string;
    message?: string;
    providerExperienceYears?: number;
};
type ChatRecommendationInput = {
    latestMessage?: string;
    jobTitle?: string;
    draft?: string;
    jobStatus?: string;
    userRole?: string;
};
export type JobRecommendationOutput = {
    improvedTitle: string;
    improvedDescription: string;
    checklist: string[];
    warnings: string[];
    recommendedBudget: {
        min: number;
        recommended: number;
        max: number;
    };
};
export type BidRecommendationOutput = {
    score: number;
    suggestedBidAmount: number | null;
    suggestedMessage: string;
    strategy: string;
    riskFlags: string[];
};
export type ChatRecommendationOutput = {
    quickReplies: string[];
    tone: 'professional' | 'friendly' | 'urgent';
    safetyNote: string;
};
export declare const recommendJobDescription: (input: JobRecommendationInput) => Promise<JobRecommendationOutput>;
export declare const recommendBid: (input: BidRecommendationInput) => Promise<BidRecommendationOutput>;
export declare const recommendChatReplies: (input: ChatRecommendationInput) => Promise<ChatRecommendationOutput>;
export {};
//# sourceMappingURL=recommendationEngine.d.ts.map