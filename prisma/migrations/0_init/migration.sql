-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "Role" AS ENUM ('INCIDENT_MANAGER', 'SECURITY_LEAD', 'COMMUNICATIONS_OFFICER', 'LEGAL_COUNSEL', 'EXECUTIVE_REVIEWER', 'AUDITOR');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "IncidentSeverity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "IncidentStatus" AS ENUM ('ACTIVE', 'CONTAINED', 'RESOLVED', 'CLOSED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "EpistemicStatus" AS ENUM ('CONFIRMED', 'SUSPECTED', 'UNKNOWN', 'DISPUTED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "AudienceType" AS ENUM ('EXECUTIVE', 'ENGINEERING', 'ALL_HANDS', 'CUSTOMER', 'REGULATORY');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "DraftStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'INVALIDATED', 'EXPORTED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ReadinessState" AS ENUM ('BLOCKED', 'NEEDS_REVIEW', 'REVIEW_READY');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ReliabilityTier" AS ENUM ('OFFICIAL_VENDOR', 'CISA_NVD', 'THREAT_INTEL', 'COMMUNITY', 'UNVERIFIED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "domain" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "passwordHash" TEXT,
    "image" TEXT,
    "role" "Role" NOT NULL DEFAULT 'COMMUNICATIONS_OFFICER',
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "sessions" (
    "id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Incident" (
    "id" TEXT NOT NULL,
    "incidentNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" "IncidentSeverity" NOT NULL DEFAULT 'HIGH',
    "status" "IncidentStatus" NOT NULL DEFAULT 'ACTIVE',
    "organizationId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "discoveryTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accessScopeStatus" "EpistemicStatus" NOT NULL DEFAULT 'UNKNOWN',
    "accessScopeDetails" TEXT,
    "exfiltrationStatus" "EpistemicStatus" NOT NULL DEFAULT 'UNKNOWN',
    "exfiltrationDetails" TEXT,
    "rootCauseStatus" "EpistemicStatus" NOT NULL DEFAULT 'UNKNOWN',
    "rootCauseDetails" TEXT,
    "affectedSystemsStatus" "EpistemicStatus" NOT NULL DEFAULT 'UNKNOWN',
    "affectedSystemsDetails" TEXT,
    "mitigationStatus" "EpistemicStatus" NOT NULL DEFAULT 'SUSPECTED',
    "mitigationDetails" TEXT,
    "regulatoryApplicability" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ExternalAdvisory" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "sourceDomain" TEXT NOT NULL,
    "reliabilityTier" "ReliabilityTier" NOT NULL DEFAULT 'COMMUNITY',
    "isQuarantined" BOOLEAN NOT NULL DEFAULT false,
    "flagReason" TEXT,
    "rawContent" TEXT,
    "cleanMarkdown" TEXT NOT NULL,
    "metadataJson" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalAdvisory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ApprovedTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "audience" "AudienceType" NOT NULL,
    "title" TEXT NOT NULL,
    "mandatorySections" TEXT NOT NULL,
    "templateBody" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovedTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "OrganizationalTerminology" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "approvedDefinition" TEXT NOT NULL,
    "forbiddenSynonyms" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationalTerminology_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CommunicationDraft" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "audience" "AudienceType" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "DraftStatus" NOT NULL DEFAULT 'DRAFT',
    "bodyText" TEXT NOT NULL,
    "claimsJson" TEXT NOT NULL,
    "readinessGate" "ReadinessState" NOT NULL DEFAULT 'BLOCKED',
    "qualityScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "qualityBreakdown" TEXT,
    "contentHash" TEXT NOT NULL,
    "factsHash" TEXT NOT NULL,
    "approvalDigest" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunicationDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ApprovalEvent" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "reviewerRole" "Role" NOT NULL,
    "action" TEXT NOT NULL,
    "decisionDigest" TEXT NOT NULL,
    "rationale" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "incidentId" TEXT,
    "actorId" TEXT NOT NULL,
    "actorEmail" TEXT NOT NULL,
    "actorRole" "Role" NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "previousStateHash" TEXT,
    "newStateHash" TEXT,
    "metadataJson" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "Organization_slug_key" ON "Organization"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE INDEX IF NOT EXISTS "User_organizationId_idx" ON "User"("organizationId");
CREATE UNIQUE INDEX IF NOT EXISTS "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");
CREATE UNIQUE INDEX IF NOT EXISTS "sessions_session_token_key" ON "sessions"("session_token");
CREATE UNIQUE INDEX IF NOT EXISTS "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");
CREATE UNIQUE INDEX IF NOT EXISTS "Incident_incidentNumber_key" ON "Incident"("incidentNumber");
CREATE INDEX IF NOT EXISTS "Incident_organizationId_idx" ON "Incident"("organizationId");
CREATE INDEX IF NOT EXISTS "Incident_incidentNumber_idx" ON "Incident"("incidentNumber");
CREATE INDEX IF NOT EXISTS "ExternalAdvisory_incidentId_idx" ON "ExternalAdvisory"("incidentId");
CREATE INDEX IF NOT EXISTS "ApprovedTemplate_organizationId_audience_idx" ON "ApprovedTemplate"("organizationId", "audience");
CREATE INDEX IF NOT EXISTS "OrganizationalTerminology_organizationId_term_idx" ON "OrganizationalTerminology"("organizationId", "term");
CREATE INDEX IF NOT EXISTS "CommunicationDraft_incidentId_audience_idx" ON "CommunicationDraft"("incidentId", "audience");
CREATE INDEX IF NOT EXISTS "ApprovalEvent_draftId_idx" ON "ApprovalEvent"("draftId");
CREATE INDEX IF NOT EXISTS "AuditLog_organizationId_incidentId_idx" ON "AuditLog"("organizationId", "incidentId");
CREATE INDEX IF NOT EXISTS "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");
