import prisma from '../lib/prisma';
const AI_RECOMMENDATION_CONFIG_ENTITY_TYPE = 'SYSTEM_CONFIG';
const AI_RECOMMENDATION_CONFIG_ENTITY_ID = 'AI_RECOMMENDATION_ENGINE';
const AI_RECOMMENDATION_CONFIG_ACTION = 'AI_RECOMMENDATION_CONFIG_UPDATED';
const CACHE_TTL_MS = 15_000;
const DEFAULT_AI_RECOMMENDATION_CONFIG = {
    bidUndercutPercent: 3,
    bidMinimumUndercut: 30,
    minProposalLength: 25,
    minJobDescriptionLength: 30,
    chatSuggestionCount: 3,
    requireSafetyNote: true,
    includeExperienceLineInBid: true,
};
let cachedConfig = null;
const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
const toNumber = (value, fallback) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
};
const clampNumber = (value, min, max) => Math.min(max, Math.max(min, value));
const toBoolean = (value, fallback) => {
    if (typeof value === 'boolean')
        return value;
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (['true', '1', 'yes', 'on'].includes(normalized))
            return true;
        if (['false', '0', 'no', 'off'].includes(normalized))
            return false;
    }
    return fallback;
};
const parseConfig = (value) => {
    const source = isRecord(value) ? value : {};
    return {
        bidUndercutPercent: clampNumber(toNumber(source.bidUndercutPercent, DEFAULT_AI_RECOMMENDATION_CONFIG.bidUndercutPercent), 1, 20),
        bidMinimumUndercut: clampNumber(toNumber(source.bidMinimumUndercut, DEFAULT_AI_RECOMMENDATION_CONFIG.bidMinimumUndercut), 10, 500),
        minProposalLength: clampNumber(toNumber(source.minProposalLength, DEFAULT_AI_RECOMMENDATION_CONFIG.minProposalLength), 10, 300),
        minJobDescriptionLength: clampNumber(toNumber(source.minJobDescriptionLength, DEFAULT_AI_RECOMMENDATION_CONFIG.minJobDescriptionLength), 20, 500),
        chatSuggestionCount: clampNumber(toNumber(source.chatSuggestionCount, DEFAULT_AI_RECOMMENDATION_CONFIG.chatSuggestionCount), 1, 5),
        requireSafetyNote: toBoolean(source.requireSafetyNote, DEFAULT_AI_RECOMMENDATION_CONFIG.requireSafetyNote),
        includeExperienceLineInBid: toBoolean(source.includeExperienceLineInBid, DEFAULT_AI_RECOMMENDATION_CONFIG.includeExperienceLineInBid),
    };
};
const extractConfig = (state) => {
    if (!isRecord(state))
        return state;
    if (isRecord(state.config))
        return state.config;
    return state;
};
export const mergeAiRecommendationConfig = (current, patch) => {
    if (!isRecord(patch)) {
        return current;
    }
    return parseConfig({
        ...current,
        ...patch,
    });
};
export const clearAiRecommendationConfigCache = () => {
    cachedConfig = null;
};
const readLatestAuditConfig = async () => {
    const log = await prisma.auditLog.findFirst({
        where: {
            entityType: AI_RECOMMENDATION_CONFIG_ENTITY_TYPE,
            entityId: AI_RECOMMENDATION_CONFIG_ENTITY_ID,
            action: AI_RECOMMENDATION_CONFIG_ACTION,
        },
        orderBy: { createdAt: 'desc' },
        select: {
            newState: true,
            createdAt: true,
        },
    });
    const config = parseConfig(extractConfig(log?.newState));
    return {
        config,
        updatedAt: log?.createdAt ? log.createdAt.toISOString() : null,
    };
};
export const getAiRecommendationConfig = async (forceRefresh = false) => {
    if (!forceRefresh && cachedConfig && cachedConfig.expiresAt > Date.now()) {
        return cachedConfig.value;
    }
    const { config, updatedAt } = await readLatestAuditConfig();
    cachedConfig = {
        value: config,
        expiresAt: Date.now() + CACHE_TTL_MS,
        updatedAt,
    };
    return config;
};
export const getAiRecommendationConfigWithMeta = async (forceRefresh = false) => {
    const config = await getAiRecommendationConfig(forceRefresh);
    return {
        config,
        updatedAt: cachedConfig?.updatedAt || null,
    };
};
export const getAiRecommendationConfigAuditIdentity = () => ({
    entityType: AI_RECOMMENDATION_CONFIG_ENTITY_TYPE,
    entityId: AI_RECOMMENDATION_CONFIG_ENTITY_ID,
    action: AI_RECOMMENDATION_CONFIG_ACTION,
});
//# sourceMappingURL=aiRecommendationConfig.js.map