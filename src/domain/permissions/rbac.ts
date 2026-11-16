export type Role =
  | 'INCIDENT_MANAGER'
  | 'SECURITY_LEAD'
  | 'COMMUNICATIONS_OFFICER'
  | 'LEGAL_COUNSEL'
  | 'EXECUTIVE_REVIEWER'
  | 'AUDITOR';

export type Action =
  | 'INCIDENT_CREATE'
  | 'INCIDENT_READ'
  | 'INCIDENT_UPDATE'
  | 'EPISTEMIC_UPDATE'
  | 'INTELLIGENCE_FETCH'
  | 'INTELLIGENCE_QUARANTINE'
  | 'TEMPLATE_MANAGE'
  | 'TERMINOLOGY_MANAGE'
  | 'DRAFT_GENERATE'
  | 'DRAFT_EDIT'
  | 'DRAFT_REQUEST_REVIEW'
  | 'DRAFT_APPROVE'
  | 'DRAFT_REJECT'
  | 'DRAFT_EXPORT'
  | 'AUDIT_READ';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  organizationId: string;
}

export interface ResourceContext {
  organizationId: string;
  audience?: 'EXECUTIVE' | 'ENGINEERING' | 'ALL_HANDS' | 'CUSTOMER' | 'REGULATORY';
  createdById?: string;
  [key: string]: unknown;
}

// Complete Role x Action Permissions Matrix
const ROLE_PERMISSIONS: Record<Role, Set<Action>> = {
  INCIDENT_MANAGER: new Set<Action>([
    'INCIDENT_CREATE',
    'INCIDENT_READ',
    'INCIDENT_UPDATE',
    'EPISTEMIC_UPDATE',
    'INTELLIGENCE_FETCH',
    'INTELLIGENCE_QUARANTINE',
    'TEMPLATE_MANAGE',
    'TERMINOLOGY_MANAGE',
    'DRAFT_GENERATE',
    'DRAFT_EDIT',
    'DRAFT_REQUEST_REVIEW',
    'DRAFT_APPROVE',
    'DRAFT_REJECT',
    'DRAFT_EXPORT',
    'AUDIT_READ',
  ]),
  SECURITY_LEAD: new Set<Action>([
    'INCIDENT_READ',
    'INCIDENT_UPDATE',
    'EPISTEMIC_UPDATE',
    'INTELLIGENCE_FETCH',
    'INTELLIGENCE_QUARANTINE',
    'DRAFT_GENERATE',
    'DRAFT_EDIT',
    'DRAFT_REQUEST_REVIEW',
    'DRAFT_APPROVE', // specifically for engineering drafts
    'DRAFT_REJECT',
    'AUDIT_READ',
  ]),
  COMMUNICATIONS_OFFICER: new Set<Action>([
    'INCIDENT_READ',
    'DRAFT_GENERATE',
    'DRAFT_EDIT',
    'DRAFT_REQUEST_REVIEW',
    'DRAFT_EXPORT',
    'AUDIT_READ',
  ]),
  LEGAL_COUNSEL: new Set<Action>([
    'INCIDENT_READ',
    'TERMINOLOGY_MANAGE',
    'DRAFT_APPROVE', // for regulatory and customer drafts
    'DRAFT_REJECT',
    'AUDIT_READ',
  ]),
  EXECUTIVE_REVIEWER: new Set<Action>([
    'INCIDENT_READ',
    'DRAFT_APPROVE', // for executive, all-hands, and customer
    'DRAFT_REJECT',
    'DRAFT_EXPORT',
    'AUDIT_READ',
  ]),
  AUDITOR: new Set<Action>([
    'INCIDENT_READ',
    'AUDIT_READ',
  ]),
};

export interface AuthorizationResult {
  authorized: boolean;
  reason?: string;
}

/**
 * Centralized authorization engine evaluating tenant boundary and RBAC matrix.
 */
export function authorize(
  user: AuthUser,
  action: Action,
  resource?: ResourceContext
): AuthorizationResult {
  // 1. Tenant boundary validation
  if (resource && resource.organizationId !== user.organizationId) {
    return {
      authorized: false,
      reason: `Tenant isolation violation: user org ${user.organizationId} cannot access resource org ${resource.organizationId}`,
    };
  }

  // 2. Role permission check
  const allowedActions = ROLE_PERMISSIONS[user.role];
  if (!allowedActions || !allowedActions.has(action)) {
    return {
      authorized: false,
      reason: `Role ${user.role} is not permitted to perform ${action}`,
    };
  }

  // 3. Audience-specific approval constraints
  if (action === 'DRAFT_APPROVE' && resource?.audience) {
    if (user.role === 'SECURITY_LEAD' && resource.audience !== 'ENGINEERING') {
      return {
        authorized: false,
        reason: 'Security Lead may only approve ENGINEERING audience drafts',
      };
    }
    if (user.role === 'LEGAL_COUNSEL' && resource.audience !== 'REGULATORY' && resource.audience !== 'CUSTOMER') {
      return {
        authorized: false,
        reason: 'Legal Counsel may only approve REGULATORY and CUSTOMER audience drafts',
      };
    }
  }

  return { authorized: true };
}
