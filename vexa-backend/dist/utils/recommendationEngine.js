import { getAiRecommendationConfig } from './aiRecommendationConfig';
const CATEGORY_BASELINE_BUDGET = {
    plumbing: { min: 300, recommended: 650 },
    electrical: { min: 300, recommended: 700 },
    cleaning: { min: 250, recommended: 600 },
    painting: { min: 400, recommended: 1200 },
    carpentry: { min: 350, recommended: 900 },
    'appliance repair': { min: 350, recommended: 900 },
    'ac service': { min: 400, recommended: 1100 },
    'pest control': { min: 450, recommended: 1400 },
    other: { min: 250, recommended: 700 },
};
const normalizeCategory = (value) => String(value || 'other').trim().toLowerCase() || 'other';
const normalizeText = (value) => String(value || '').trim();
const stripPreviousAiSummary = (value) => {
    const markerIndex = value.toLowerCase().indexOf('ai summary:');
    if (markerIndex >= 0) {
        return value.slice(0, markerIndex).trim();
    }
    return value.trim();
};
const toSentenceCase = (value) => value.length ? value.charAt(0).toUpperCase() + value.slice(1) : value;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const roundCurrency = (value) => Math.round(value / 10) * 10;
const buildChecklistFromDescription = (description) => {
    const lower = description.toLowerCase();
    const checklist = [
        'Mention exact issue symptoms and when they started',
        'Add access constraints (parking, gate pass, floor, lift)',
        'Mention preferred service time slot',
    ];
    if (!/(photo|image|pic)/.test(lower)) {
        checklist.push('Attach at least one clear photo for faster estimates');
    }
    if (!/(urgent|asap|today|immediately)/.test(lower)) {
        checklist.push('Mention urgency clearly to get relevant provider response time');
    }
    return checklist.slice(0, 5);
};
export const recommendJobDescription = async (input) => {
    const config = await getAiRecommendationConfig();
    const title = normalizeText(input.title);
    const description = stripPreviousAiSummary(normalizeText(input.description));
    const category = normalizeCategory(input.category);
    const location = normalizeText(input.location);
    const budget = Number.isFinite(input.budget) ? Number(input.budget) : undefined;
    const budgetConfig = CATEGORY_BASELINE_BUDGET[category] || CATEGORY_BASELINE_BUDGET.other;
    const recommended = roundCurrency(Math.max(budgetConfig.recommended, budget || 0));
    const min = budgetConfig.min;
    const max = roundCurrency(recommended * 1.8);
    const improvedTitle = title || `${toSentenceCase(category)} service required${location ? ` in ${location}` : ''}`;
    const baseDescription = description || 'Need a verified professional for this service request.';
    const normalizedDescription = baseDescription.replace(/\s+/g, ' ').trim();
    const improvedDescription = /[.!?]$/.test(normalizedDescription)
        ? normalizedDescription
        : `${normalizedDescription}.`;
    const warnings = [];
    if (typeof budget === 'number' && budget < min) {
        warnings.push(`Entered budget is below recommended minimum for ${category} (Rs ${min}).`);
    }
    if (description.length < config.minJobDescriptionLength) {
        warnings.push('Description is short. Add issue details to reduce wrong bids and revisions.');
    }
    return {
        improvedTitle,
        improvedDescription,
        checklist: buildChecklistFromDescription(baseDescription),
        warnings,
        recommendedBudget: {
            min,
            recommended,
            max,
        },
    };
};
export const recommendBid = async (input) => {
    const config = await getAiRecommendationConfig();
    const category = normalizeCategory(input.jobCategory);
    const baseline = CATEGORY_BASELINE_BUDGET[category] || CATEGORY_BASELINE_BUDGET.other;
    const lowest = Number.isFinite(input.currentLowestBid)
        ? Number(input.currentLowestBid)
        : undefined;
    const myBid = Number.isFinite(input.myBidAmount)
        ? Number(input.myBidAmount)
        : undefined;
    let suggestedBidAmount = null;
    if (typeof lowest === 'number') {
        const undercutBy = Math.max(config.bidMinimumUndercut, lowest * (config.bidUndercutPercent / 100));
        suggestedBidAmount = roundCurrency(Math.max(baseline.min, lowest - undercutBy));
    }
    else if (typeof myBid === 'number') {
        suggestedBidAmount = roundCurrency(Math.max(baseline.min, myBid));
    }
    else {
        suggestedBidAmount = roundCurrency(Math.max(baseline.min, baseline.recommended));
    }
    const riskFlags = [];
    let score = 82;
    if (typeof myBid === 'number' && myBid < baseline.min) {
        score -= 20;
        riskFlags.push('Bid is too low for category baseline and may look unrealistic.');
    }
    if (typeof lowest === 'number' && typeof myBid === 'number' && myBid > lowest * 1.15) {
        score -= 16;
        riskFlags.push('Bid is significantly higher than current competition.');
    }
    const message = normalizeText(input.message);
    if (message.length < config.minProposalLength) {
        score -= 12;
        riskFlags.push('Proposal message is too short and may reduce conversion.');
    }
    const estimatedDuration = normalizeText(input.estimatedDuration);
    if (!estimatedDuration) {
        score -= 8;
        riskFlags.push('Estimated duration is missing.');
    }
    const experience = Number(input.providerExperienceYears || 0);
    if (experience >= 3) {
        score += 6;
    }
    score = clamp(score, 30, 98);
    const suggestedMessageParts = [
        `Hello, I can take up \"${normalizeText(input.jobTitle) || 'this job'}\".`,
        `Estimated completion: ${estimatedDuration || 'as per site inspection and scope'}.`,
        'I will confirm final scope on arrival and keep material/labor transparent.',
    ];
    if (config.includeExperienceLineInBid) {
        suggestedMessageParts.splice(1, 0, `I have ${Math.max(1, experience || 1)}+ years experience in ${toSentenceCase(category)} work.`);
    }
    const suggestedMessage = suggestedMessageParts.join(' ');
    const strategy = score >= 80
        ? 'Strong bid. Keep communication fast and professional to improve acceptance chance.'
        : 'Improve pricing clarity and proposal detail before submitting this bid.';
    return {
        score,
        suggestedBidAmount,
        suggestedMessage,
        strategy,
        riskFlags,
    };
};
export const recommendChatReplies = async (input) => {
    const config = await getAiRecommendationConfig();
    const latest = normalizeText(input.latestMessage).toLowerCase();
    const draft = normalizeText(input.draft);
    const role = String(input.userRole || '').toUpperCase();
    let tone = 'professional';
    if (/(urgent|asap|now|immediately)/.test(latest)) {
        tone = 'urgent';
    }
    else if (/(thanks|thank you|great|awesome)/.test(latest)) {
        tone = 'friendly';
    }
    const quickReplies = [];
    if (/(where|location|reach|arrive|eta|when)/.test(latest)) {
        if (role === 'PROVIDER') {
            quickReplies.push('I am on the way and will share ETA shortly.');
            quickReplies.push('I should reach in around 20-30 minutes depending on traffic.');
        }
        else {
            quickReplies.push('Please share your latest ETA so I can plan accordingly.');
            quickReplies.push('Can you confirm arrival time and current location?');
        }
    }
    if (/(price|cost|charge|amount|budget)/.test(latest)) {
        if (role === 'PROVIDER') {
            quickReplies.push('I will confirm final cost after a quick inspection to avoid surprises.');
            quickReplies.push('Current estimate is within the agreed budget range.');
        }
        else {
            quickReplies.push('Please confirm the final amount before starting work.');
            quickReplies.push('Can you share a clear quote breakup for labor and parts?');
        }
    }
    if (/(photo|image|picture)/.test(latest)) {
        if (role === 'PROVIDER') {
            quickReplies.push('Please share a clear photo so I can confirm tools and parts needed.');
        }
        else {
            quickReplies.push('I have shared photos. Please confirm if anything else is needed.');
        }
    }
    if (!quickReplies.length) {
        if (role === 'PROVIDER') {
            quickReplies.push('Got it. I will proceed and keep you updated step by step.');
            quickReplies.push('Thanks for the update. I am coordinating this now.');
            quickReplies.push('Understood. I will confirm once completed.');
        }
        else {
            quickReplies.push('Thanks. Please keep me posted on each step.');
            quickReplies.push('Understood. Please share completion update once done.');
            quickReplies.push('Got it. I will be available here if anything changes.');
        }
    }
    if (draft.length > 0 && draft.length < 20) {
        quickReplies.unshift(`${draft} - I will share the next update shortly.`);
    }
    return {
        quickReplies: quickReplies.slice(0, config.chatSuggestionCount),
        tone,
        safetyNote: config.requireSafetyNote
            ? 'Do not share OTPs, UPI PIN, or personal banking details in chat. Keep all communication in-app.'
            : 'Safety guidance is currently hidden by admin settings.',
    };
};
//# sourceMappingURL=recommendationEngine.js.map