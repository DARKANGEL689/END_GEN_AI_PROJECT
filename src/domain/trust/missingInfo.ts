import type { AudienceType } from '@prisma/client';

export interface InformationGap {
  id: string;
  urgency: 'HIGH' | 'MEDIUM' | 'LOW';
  category:
    | 'REGULATORY_STATUTORY_TIMELINE'
    | 'ROOT_CAUSE_DETAIL'
    | 'CUSTOMER_ACTIONABLE_GUIDANCE'
    | 'CONTAINMENT_VERIFICATION'
    | 'EXTERNAL_INTEL_DEFICIT';
  recommendation: string;
  affectedAudiences: AudienceType[];
}

export interface MissingInformationReport {
  hasGaps: boolean;
  highUrgencyCount: number;
  mediumUrgencyCount: number;
  gaps: InformationGap[];
}

export interface MissingInfoContext {
  severity: string;
  category: string;
  regulatoryApplicability?: string | null;
  rootCauseStatus: string;
  rootCauseDetails?: string | null;
  mitigationStatus: string;
  advisoriesCount: number;
  drafts: Array<{
    audience: AudienceType;
    bodyText: string;
  }>;
}

/**
 * Analyzes incident context and communication drafts to detect critical operational information gaps.
 */
export function detectMissingInformation(context: MissingInfoContext): MissingInformationReport {
  const gaps: InformationGap[] = [];

  // 1. Regulatory Statutory Timeline Check
  if (context.regulatoryApplicability && context.regulatoryApplicability.trim().length > 0) {
    const regDraft = context.drafts.find((d) => d.audience === 'REGULATORY');
    const hasTimelineMention =
      regDraft &&
      /\b(72 hours|statutory|deadline|filing window|breach notification window|regulatory deadline)\b/i.test(
        regDraft.bodyText
      );

    if (!regDraft || !hasTimelineMention) {
      gaps.push({
        id: 'gap-reg-01',
        urgency: 'HIGH',
        category: 'REGULATORY_STATUTORY_TIMELINE',
        recommendation:
          'Incident has statutory regulatory applicability, but the regulatory draft does not clearly specify compliance disclosure deadlines (e.g. GDPR 72-hour or SEC 4-day filing window).',
        affectedAudiences: ['REGULATORY'],
      });
    }
  }

  // 2. High Severity Root Cause Gap
  if (
    (context.severity === 'CRITICAL' || context.severity === 'HIGH') &&
    context.rootCauseStatus === 'UNKNOWN'
  ) {
    const engDraft = context.drafts.find((d) => d.audience === 'ENGINEERING');
    const mentionsInvestigation =
      engDraft && /\b(forensic investigation|triage underway|root cause analysis|active telemetry)\b/i.test(engDraft.bodyText);

    if (!mentionsInvestigation) {
      gaps.push({
        id: 'gap-rc-01',
        urgency: 'HIGH',
        category: 'ROOT_CAUSE_DETAIL',
        recommendation:
          'Incident is classified as high severity with root cause UNKNOWN, but engineering draft lacks explicit notice of active forensic root-cause investigation steps.',
        affectedAudiences: ['ENGINEERING', 'EXECUTIVE'],
      });
    }
  }

  // 3. Customer Actionable Guidance Check
  const custDraft = context.drafts.find((d) => d.audience === 'CUSTOMER');
  if (custDraft) {
    const hasProtectiveGuidance =
      /\b(mfa|multi-factor|password|credential|log out|support|help desk|trust center|action required)\b/i.test(
        custDraft.bodyText
      );

    if (!hasProtectiveGuidance) {
      gaps.push({
        id: 'gap-cust-01',
        urgency: 'MEDIUM',
        category: 'CUSTOMER_ACTIONABLE_GUIDANCE',
        recommendation:
          'Customer-facing communication describes security incident but lacks actionable self-defense guidance (e.g. MFA verification, session review, or support contact details).',
        affectedAudiences: ['CUSTOMER'],
      });
    }
  }

  // 4. External Intelligence Deficit
  if (
    (context.category.includes('VULNERABILITY') || context.category.includes('ZERO_DAY') || context.category.includes('BREACH')) &&
    context.advisoriesCount === 0
  ) {
    gaps.push({
      id: 'gap-intel-01',
      urgency: 'MEDIUM',
      category: 'EXTERNAL_INTEL_DEFICIT',
      recommendation:
        'Zero external threat intelligence advisories (CISA, NVD, vendor alerts) have been retrieved for this zero-day or perimeter breach. Retrieve official guidance via Firecrawl.',
      affectedAudiences: ['ENGINEERING', 'EXECUTIVE'],
    });
  }

  const highUrgencyCount = gaps.filter((g) => g.urgency === 'HIGH').length;
  const mediumUrgencyCount = gaps.filter((g) => g.urgency === 'MEDIUM').length;

  return {
    hasGaps: gaps.length > 0,
    highUrgencyCount,
    mediumUrgencyCount,
    gaps,
  };
}
