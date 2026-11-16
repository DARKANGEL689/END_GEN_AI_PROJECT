import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';

// Load .env if present
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      process.env[match[1]] = value.trim();
    }
  }
}

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  const sql = neon(connectionString);

  const enums = [
    `DO $do$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role') THEN CREATE TYPE "Role" AS ENUM ('INCIDENT_MANAGER', 'SECURITY_LEAD', 'COMMUNICATIONS_OFFICER', 'LEGAL_COUNSEL', 'EXECUTIVE_REVIEWER', 'AUDITOR'); END IF; END $do$`,
    `DO $do$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'IncidentSeverity') THEN CREATE TYPE "IncidentSeverity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW'); END IF; END $do$`,
    `DO $do$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'IncidentStatus') THEN CREATE TYPE "IncidentStatus" AS ENUM ('ACTIVE', 'CONTAINED', 'RESOLVED', 'CLOSED'); END IF; END $do$`,
    `DO $do$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EpistemicStatus') THEN CREATE TYPE "EpistemicStatus" AS ENUM ('CONFIRMED', 'SUSPECTED', 'UNKNOWN', 'DISPUTED'); END IF; END $do$`,
    `DO $do$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AudienceType') THEN CREATE TYPE "AudienceType" AS ENUM ('EXECUTIVE', 'ENGINEERING', 'ALL_HANDS', 'CUSTOMER', 'REGULATORY'); END IF; END $do$`,
    `DO $do$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DraftStatus') THEN CREATE TYPE "DraftStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'INVALIDATED', 'EXPORTED'); END IF; END $do$`,
    `DO $do$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReadinessState') THEN CREATE TYPE "ReadinessState" AS ENUM ('BLOCKED', 'NEEDS_REVIEW', 'REVIEW_READY'); END IF; END $do$`,
    `DO $do$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReliabilityTier') THEN CREATE TYPE "ReliabilityTier" AS ENUM ('OFFICIAL_VENDOR', 'CISA_NVD', 'THREAT_INTEL', 'COMMUNITY', 'UNVERIFIED'); END IF; END $do$`,
  ];

  const tables = [
    `CREATE TABLE IF NOT EXISTS "Organization" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "slug" TEXT NOT NULL UNIQUE,
      "domain" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS "User" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT,
      "email" TEXT NOT NULL UNIQUE,
      "emailVerified" TIMESTAMP(3),
      "passwordHash" TEXT,
      "image" TEXT,
      "role" "Role" NOT NULL DEFAULT 'COMMUNICATIONS_OFFICER',
      "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS "User_organizationId_idx" ON "User"("organizationId")`,
    `CREATE TABLE IF NOT EXISTS "accounts" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "user_id" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
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
      CONSTRAINT "accounts_provider_provider_account_id_key" UNIQUE ("provider", "provider_account_id")
    )`,
    `CREATE TABLE IF NOT EXISTS "sessions" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "session_token" TEXT NOT NULL UNIQUE,
      "user_id" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      "expires" TIMESTAMP(3) NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS "verification_tokens" (
      "identifier" TEXT NOT NULL,
      "token" TEXT NOT NULL,
      "expires" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "verification_tokens_identifier_token_key" UNIQUE ("identifier", "token")
    )`,
    `CREATE TABLE IF NOT EXISTS "Incident" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "incidentNumber" TEXT NOT NULL UNIQUE,
      "title" TEXT NOT NULL,
      "description" TEXT NOT NULL,
      "category" TEXT NOT NULL,
      "severity" "IncidentSeverity" NOT NULL DEFAULT 'HIGH',
      "status" "IncidentStatus" NOT NULL DEFAULT 'ACTIVE',
      "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      "createdById" TEXT NOT NULL REFERENCES "User"("id") ON UPDATE CASCADE,
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
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS "Incident_organizationId_idx" ON "Incident"("organizationId")`,
    `CREATE INDEX IF NOT EXISTS "Incident_incidentNumber_idx" ON "Incident"("incidentNumber")`,
    `CREATE TABLE IF NOT EXISTS "ExternalAdvisory" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "incidentId" TEXT NOT NULL REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      "sourceUrl" TEXT NOT NULL,
      "sourceDomain" TEXT NOT NULL,
      "reliabilityTier" "ReliabilityTier" NOT NULL DEFAULT 'COMMUNITY',
      "isQuarantined" BOOLEAN NOT NULL DEFAULT false,
      "flagReason" TEXT,
      "rawContent" TEXT,
      "cleanMarkdown" TEXT NOT NULL,
      "metadataJson" TEXT,
      "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS "ExternalAdvisory_incidentId_idx" ON "ExternalAdvisory"("incidentId")`,
    `CREATE TABLE IF NOT EXISTS "ApprovedTemplate" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      "audience" "AudienceType" NOT NULL,
      "title" TEXT NOT NULL,
      "mandatorySections" TEXT NOT NULL,
      "templateBody" TEXT NOT NULL,
      "version" INTEGER NOT NULL DEFAULT 1,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS "ApprovedTemplate_organizationId_audience_idx" ON "ApprovedTemplate"("organizationId", "audience")`,
    `CREATE TABLE IF NOT EXISTS "OrganizationalTerminology" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      "term" TEXT NOT NULL,
      "approvedDefinition" TEXT NOT NULL,
      "forbiddenSynonyms" TEXT NOT NULL,
      "category" TEXT NOT NULL DEFAULT 'GENERAL',
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS "OrganizationalTerminology_organizationId_term_idx" ON "OrganizationalTerminology"("organizationId", "term")`,
    `CREATE TABLE IF NOT EXISTS "CommunicationDraft" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "incidentId" TEXT NOT NULL REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE,
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
      "createdById" TEXT NOT NULL REFERENCES "User"("id") ON UPDATE CASCADE,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS "CommunicationDraft_incidentId_audience_idx" ON "CommunicationDraft"("incidentId", "audience")`,
    `CREATE TABLE IF NOT EXISTS "ApprovalEvent" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "draftId" TEXT NOT NULL REFERENCES "CommunicationDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      "reviewerId" TEXT NOT NULL REFERENCES "User"("id") ON UPDATE CASCADE,
      "reviewerRole" "Role" NOT NULL,
      "action" TEXT NOT NULL,
      "decisionDigest" TEXT NOT NULL,
      "rationale" TEXT,
      "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS "ApprovalEvent_draftId_idx" ON "ApprovalEvent"("draftId")`,
    `CREATE TABLE IF NOT EXISTS "AuditLog" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      "incidentId" TEXT REFERENCES "Incident"("id") ON DELETE SET NULL ON UPDATE CASCADE,
      "actorId" TEXT NOT NULL REFERENCES "User"("id") ON UPDATE CASCADE,
      "actorEmail" TEXT NOT NULL,
      "actorRole" "Role" NOT NULL,
      "action" TEXT NOT NULL,
      "entityType" TEXT NOT NULL,
      "entityId" TEXT NOT NULL,
      "previousStateHash" TEXT,
      "newStateHash" TEXT,
      "metadataJson" TEXT,
      "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS "AuditLog_organizationId_incidentId_idx" ON "AuditLog"("organizationId", "incidentId")`,
    `CREATE INDEX IF NOT EXISTS "AuditLog_timestamp_idx" ON "AuditLog"("timestamp")`,
  ];

  console.log(`Applying enums...`);
  for (const e of enums) {
    await sql.query(e);
  }

  console.log(`Applying tables and indices...`);
  for (let i = 0; i < tables.length; i++) {
    const t = tables[i];
    await sql.query(t);
    console.log(`[${i + 1}/${tables.length}] Done`);
  }

  console.log('✅ All tables and enums successfully created in Neon PostgreSQL!');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
