export type PlanName = "free" | "pro" | "business" | "institution";

export type AnalyticsLevel = "basic" | "standard" | "advanced";

export type CustomBrandingLevel = false | "basic" | "full" | "custom";

export type PdfExportLevel = false | "basic" | "branded" | "advanced";

export type PrivateRoomsLimit = false | number | true;

export type PlanLimits = {
  name: PlanName;
  label: string;
  monthlyPrice: number | null;
  monthlyPriceLabel: string;
  selectableTemplates: number | null;
  maxGalleries: number | null;
  maxArtworksTotal: number | null;
  maxArtworksPerGallery: number | null;
  maxArtworksVisiblePerRoom: number | null;
  maxStorageMb: number | null;
  maxArtworkFileMb: number | null;
  maxRequestsPerMonth: number | null;
  analytics: AnalyticsLevel;
  customBranding: CustomBrandingLevel;
  pdfExport: PdfExportLevel;
  privateRooms: PrivateRoomsLimit;
  embed: boolean;
  customRooms: boolean;
  prioritySupport: boolean;
};

export type PlanFeatureName =
  | "analytics"
  | "customBranding"
  | "pdfExport"
  | "privateRooms"
  | "embed"
  | "customRooms"
  | "prioritySupport";

export type LimitCheckResult = {
  allowed: boolean;
  reason?: string;
  current?: number;
  limit?: number | null;
  upgradeTo?: PlanName | null;
};

export const PLAN_ORDER: PlanName[] = [
  "free",
  "pro",
  "business",
  "institution",
];

export const PLAN_LIMITS: Record<PlanName, PlanLimits> = {
  free: {
    name: "free",
    label: "Free",
    monthlyPrice: 0,
    monthlyPriceLabel: "0€",
    selectableTemplates: 3,
    maxGalleries: 1,
    maxArtworksTotal: 15,
    maxArtworksPerGallery: 15,
    maxArtworksVisiblePerRoom: 15,
    maxStorageMb: 25,
    maxArtworkFileMb: 2,
    maxRequestsPerMonth: 20,
    analytics: "basic",
    customBranding: false,
    pdfExport: false,
    privateRooms: false,
    embed: false,
    customRooms: false,
    prioritySupport: false,
  },

  pro: {
    name: "pro",
    label: "Pro",
    monthlyPrice: 19,
    monthlyPriceLabel: "19€/mese",
    selectableTemplates: 10,
    maxGalleries: 3,
    maxArtworksTotal: 150,
    maxArtworksPerGallery: 50,
    maxArtworksVisiblePerRoom: 30,
    maxStorageMb: 250,
    maxArtworkFileMb: 4,
    maxRequestsPerMonth: 200,
    analytics: "standard",
    customBranding: "basic",
    pdfExport: "basic",
    privateRooms: 1,
    embed: false,
    customRooms: false,
    prioritySupport: false,
  },

  business: {
    name: "business",
    label: "Business",
    monthlyPrice: 59,
    monthlyPriceLabel: "59€/mese",
    selectableTemplates: 20,
    maxGalleries: 5,
    maxArtworksTotal: 500,
    maxArtworksPerGallery: 100,
    maxArtworksVisiblePerRoom: 40,
    maxStorageMb: 1024,
    maxArtworkFileMb: 8,
    maxRequestsPerMonth: null,
    analytics: "advanced",
    customBranding: "full",
    pdfExport: "branded",
    privateRooms: true,
    embed: true,
    customRooms: false,
    prioritySupport: false,
  },

  institution: {
    name: "institution",
    label: "Institution",
    monthlyPrice: 199,
    monthlyPriceLabel: "da 199€/mese",
    selectableTemplates: null,
    maxGalleries: null,
    maxArtworksTotal: null,
    maxArtworksPerGallery: null,
    maxArtworksVisiblePerRoom: null,
    maxStorageMb: 10240,
    maxArtworkFileMb: 25,
    maxRequestsPerMonth: null,
    analytics: "advanced",
    customBranding: "custom",
    pdfExport: "advanced",
    privateRooms: true,
    embed: true,
    customRooms: true,
    prioritySupport: true,
  },
};

export function normalizePlanName(value: unknown): PlanName {
  if (
    value === "free" ||
    value === "pro" ||
    value === "business" ||
    value === "institution"
  ) {
    return value;
  }

  return "free";
}

export function getPlanLimits(plan: unknown): PlanLimits {
  return PLAN_LIMITS[normalizePlanName(plan)];
}

export function getNextPlan(plan: PlanName): PlanName | null {
  const currentIndex = PLAN_ORDER.indexOf(plan);

  if (currentIndex < 0) {
    return "pro";
  }

  return PLAN_ORDER[currentIndex + 1] || null;
}

export function getUpgradeTarget(plan: PlanName): PlanName | null {
  if (plan === "free") {
    return "pro";
  }

  if (plan === "pro") {
    return "business";
  }

  if (plan === "business") {
    return "institution";
  }

  return null;
}

export function formatLimitValue(value: number | null) {
  if (value === null) {
    return "Illimitato";
  }

  return String(value);
}

export function formatMb(value: number | null) {
  if (value === null) {
    return "Illimitato";
  }

  if (value >= 1024) {
    const gb = value / 1024;

    return `${Number.isInteger(gb) ? gb : gb.toFixed(1)} GB`;
  }

  return `${value} MB`;
}

export function bytesToMb(bytes: number | null | undefined) {
  if (!bytes || bytes <= 0) {
    return 0;
  }

  return bytes / 1024 / 1024;
}

export function mbToBytes(mb: number) {
  return mb * 1024 * 1024;
}

export function isLimitReached(current: number, limit: number | null) {
  if (limit === null) {
    return false;
  }

  return current >= limit;
}

export function isOverLimit(current: number, limit: number | null) {
  if (limit === null) {
    return false;
  }

  return current > limit;
}

export function canCreateGallery(
  profilePlan: unknown,
  currentGalleryCount: number
): LimitCheckResult {
  const plan = normalizePlanName(profilePlan);
  const limits = getPlanLimits(plan);

  if (limits.maxGalleries === null) {
    return {
      allowed: true,
      current: currentGalleryCount,
      limit: null,
    };
  }

  const allowed = currentGalleryCount < limits.maxGalleries;

  return {
    allowed,
    current: currentGalleryCount,
    limit: limits.maxGalleries,
    upgradeTo: allowed ? null : getUpgradeTarget(plan),
    reason: allowed
      ? undefined
      : `Hai raggiunto il limite di gallerie del piano ${limits.label}.`,
  };
}

export function canUploadArtwork(params: {
  profilePlan: unknown;
  currentArtworkCount: number;
  currentStorageUsedMb: number;
  newFileSizeMb: number;
}): LimitCheckResult {
  const plan = normalizePlanName(params.profilePlan);
  const limits = getPlanLimits(plan);

  if (
    limits.maxArtworkFileMb !== null &&
    params.newFileSizeMb > limits.maxArtworkFileMb
  ) {
    return {
      allowed: false,
      current: params.newFileSizeMb,
      limit: limits.maxArtworkFileMb,
      upgradeTo: getUpgradeTarget(plan),
      reason: `Il file supera il peso massimo consentito dal piano ${limits.label}.`,
    };
  }

  if (
    limits.maxArtworksTotal !== null &&
    params.currentArtworkCount >= limits.maxArtworksTotal
  ) {
    return {
      allowed: false,
      current: params.currentArtworkCount,
      limit: limits.maxArtworksTotal,
      upgradeTo: getUpgradeTarget(plan),
      reason: `Hai raggiunto il numero massimo di opere del piano ${limits.label}.`,
    };
  }

  const nextStorageUsed = params.currentStorageUsedMb + params.newFileSizeMb;

  if (limits.maxStorageMb !== null && nextStorageUsed > limits.maxStorageMb) {
    return {
      allowed: false,
      current: nextStorageUsed,
      limit: limits.maxStorageMb,
      upgradeTo: getUpgradeTarget(plan),
      reason: `Hai raggiunto il limite di storage del piano ${limits.label}.`,
    };
  }

  return {
    allowed: true,
    current: params.currentArtworkCount,
    limit: limits.maxArtworksTotal,
  };
}

export function canAddArtworkToGallery(
  profilePlan: unknown,
  currentGalleryArtworkCount: number
): LimitCheckResult {
  const plan = normalizePlanName(profilePlan);
  const limits = getPlanLimits(plan);

  if (limits.maxArtworksPerGallery === null) {
    return {
      allowed: true,
      current: currentGalleryArtworkCount,
      limit: null,
    };
  }

  const allowed = currentGalleryArtworkCount < limits.maxArtworksPerGallery;

  return {
    allowed,
    current: currentGalleryArtworkCount,
    limit: limits.maxArtworksPerGallery,
    upgradeTo: allowed ? null : getUpgradeTarget(plan),
    reason: allowed
      ? undefined
      : `Questa galleria ha raggiunto il limite di opere del piano ${limits.label}.`,
  };
}

export function canReceiveRequest(
  profilePlan: unknown,
  currentMonthlyRequestsCount: number
): LimitCheckResult {
  const plan = normalizePlanName(profilePlan);
  const limits = getPlanLimits(plan);

  if (limits.maxRequestsPerMonth === null) {
    return {
      allowed: true,
      current: currentMonthlyRequestsCount,
      limit: null,
    };
  }

  const allowed = currentMonthlyRequestsCount < limits.maxRequestsPerMonth;

  return {
    allowed,
    current: currentMonthlyRequestsCount,
    limit: limits.maxRequestsPerMonth,
    upgradeTo: allowed ? null : getUpgradeTarget(plan),
    reason: allowed
      ? undefined
      : "La galleria ha raggiunto il limite mensile di richieste ricevibili.",
  };
}

export function canUseTemplateByIndex(
  profilePlan: unknown,
  templateIndex: number
): LimitCheckResult {
  const plan = normalizePlanName(profilePlan);
  const limits = getPlanLimits(plan);

  if (limits.selectableTemplates === null) {
    return {
      allowed: true,
      current: templateIndex + 1,
      limit: null,
    };
  }

  const allowed = templateIndex < limits.selectableTemplates;

  return {
    allowed,
    current: templateIndex + 1,
    limit: limits.selectableTemplates,
    upgradeTo: allowed ? null : getUpgradeTarget(plan),
    reason: allowed
      ? undefined
      : `Questo template non è incluso nel piano ${limits.label}.`,
  };
}

export function canUseTemplateByPlan(
  profilePlan: unknown,
  templateAvailableFromPlan: unknown
): LimitCheckResult {
  const userPlan = normalizePlanName(profilePlan);
  const requiredPlan = normalizePlanName(templateAvailableFromPlan);

  const userIndex = PLAN_ORDER.indexOf(userPlan);
  const requiredIndex = PLAN_ORDER.indexOf(requiredPlan);

  const allowed = userIndex >= requiredIndex;

  return {
    allowed,
    current: userIndex,
    limit: requiredIndex,
    upgradeTo: allowed ? null : requiredPlan,
    reason: allowed
      ? undefined
      : `Questo template richiede il piano ${PLAN_LIMITS[requiredPlan].label}.`,
  };
}

export function canUseFeature(
  profilePlan: unknown,
  featureName: PlanFeatureName
): boolean {
  const limits = getPlanLimits(profilePlan);

  const featureValue = limits[featureName];

  if (featureValue === false) {
    return false;
  }

  if (featureValue === null) {
    return false;
  }

  return true;
}

export function getPlanUsagePercentage(current: number, limit: number | null) {
  if (limit === null || limit <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((current / limit) * 100));
}

export function getPlanLimitMessage(params: {
  plan: unknown;
  resourceLabel: string;
  current: number;
  limit: number | null;
}) {
  const limits = getPlanLimits(params.plan);

  if (params.limit === null) {
    return `${params.resourceLabel}: ${params.current} / Illimitato`;
  }

  return `${params.resourceLabel}: ${params.current} / ${params.limit} — Piano ${limits.label}`;
}