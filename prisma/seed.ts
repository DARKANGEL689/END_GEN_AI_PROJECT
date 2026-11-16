import 'dotenv/config';
import { Role, IncidentSeverity, IncidentStatus, EpistemicStatus, AudienceType } from '@prisma/client';
import { prisma } from '../src/infrastructure/db/client';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Organization
  let org = await prisma.organization.findUnique({
    where: { slug: 'sentinel-sec' },
  });

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: 'Sentinel Enterprise Defense',
        slug: 'sentinel-sec',
        domain: 'sentinel.defense',
      },
    });
  }
  console.log(`✅ Organization created: ${org.name} (${org.id})`);

  // 2. Users with Roles
  const defaultPassword = await bcrypt.hash('incident2026!', 10);

  const usersData = [
    {
      name: 'Alex Rivera',
      email: 'im@sentinel.defense',
      role: Role.INCIDENT_MANAGER,
    },
    {
      name: 'Marcus Vance',
      email: 'sec@sentinel.defense',
      role: Role.SECURITY_LEAD,
    },
    {
      name: 'Elena Rostova',
      email: 'comms@sentinel.defense',
      role: Role.COMMUNICATIONS_OFFICER,
    },
    {
      name: 'Sarah Chen',
      email: 'legal@sentinel.defense',
      role: Role.LEGAL_COUNSEL,
    },
    {
      name: 'David Keller',
      email: 'exec@sentinel.defense',
      role: Role.EXECUTIVE_REVIEWER,
    },
    {
      name: 'Rachel Adams',
      email: 'auditor@sentinel.defense',
      role: Role.AUDITOR,
    },
  ];

  const createdUsers: Record<string, string> = {};
  for (const u of usersData) {
    let user = await prisma.user.findUnique({
      where: { email: u.email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          name: u.name,
          email: u.email,
          role: u.role,
          passwordHash: defaultPassword,
          organizationId: org.id,
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { role: u.role, passwordHash: defaultPassword },
      });
    }
    createdUsers[u.role] = user.id;
    console.log(`👤 User ready: ${user.name} (${user.role}) - ${user.email}`);
  }

  // 3. Approved Communication Templates (5 Audiences)
  const templates = [
    {
      audience: AudienceType.EXECUTIVE,
      title: 'Executive Incident Briefing Template (Standard)',
      mandatorySections: JSON.stringify([
        'Situation Summary',
        'Operational & Financial Impact',
        'Legal & Regulatory Exposure',
        'Leadership Directives & Decisions',
      ]),
      templateBody: `## Situation Summary
Brief factual overview of current state, severity classification, and discovery timeline.

## Operational & Financial Impact
Current status of critical business systems, potential downtime estimates, and customer-impacting outages.

## Legal & Regulatory Exposure
Mandatory disclosure clocks (e.g. SEC Item 1.05, GDPR Art 33), litigation risks, and outside counsel status.

## Leadership Directives & Decisions
Decisions required from executive leadership within the next 4 hours.`,
    },
    {
      audience: AudienceType.ENGINEERING,
      title: 'Engineering & SecOps Technical Directive',
      mandatorySections: JSON.stringify([
        'Incident Overview & IOCs',
        'Containment Status & Forensics',
        'Remediation Procedures & Patch Guidance',
        'Monitoring & Verification',
      ]),
      templateBody: `## Incident Overview & IOCs
Technical root cause, affected software versions, CVE references, and known network indicators of compromise.

## Containment Status & Forensics
Current isolation state of endpoints, network segmentation adjustments, and active memory captures.

## Remediation Procedures & Patch Guidance
Step-by-step engineering workarounds, configuration hardening, and verified patch deployments.

## Monitoring & Verification
Log queries, SIEM alerts to monitor, and exit criteria for restored operations.`,
    },
    {
      audience: AudienceType.ALL_HANDS,
      title: 'Company-Wide Staff Security Advisory',
      mandatorySections: JSON.stringify([
        'What Happened',
        'What It Means For You',
        'Immediate Action Items',
        'Phishing & Verification Reminder',
      ]),
      templateBody: `## What Happened
Clear, non-technical explanation of the incident without jargon or alarmist phrasing.

## What It Means For You
Impact on day-to-day employee operations, internal communication channels, and laptop usage.

## Immediate Action Items
Concrete actions required by every staff member (e.g. password rotation, restarting machines).

## Phishing & Verification Reminder
Caution against secondary social engineering, unverified Slack requests, or external journalist outreach.`,
    },
    {
      audience: AudienceType.CUSTOMER,
      title: 'Customer Security Advisory & FAQ',
      mandatorySections: JSON.stringify([
        'Statement of Incident',
        'Customer Data & Service Status',
        'Actions Taken to Protect You',
        'Support & Inquiries',
      ]),
      templateBody: `## Statement of Incident
Transparent notification regarding the security incident, framing our proactive defense response.

## Customer Data & Service Status
Explicit, legally vetted statement on customer data status (hedged appropriately if under investigation).

## Actions Taken to Protect You
Immediate containment controls applied, third-party forensic engagement, and enhanced telemetry.

## Support & Inquiries
Dedicated support contact points and schedule for next public bulletin.`,
    },
    {
      audience: AudienceType.REGULATORY,
      title: 'Regulatory Initial Breach Notification (GDPR / SEC)',
      mandatorySections: JSON.stringify([
        'Notification Details & Authority',
        'Nature & Timing of the Incident',
        'Categories of Data & Individuals Concerned',
        'Technical & Organizational Mitigation Measures',
      ]),
      templateBody: `## Notification Details & Authority
Supervisory authority addressed, reporting controller details, and statutory reporting window adherence.

## Nature & Timing of the Incident
Date and time of discovery, estimated time of initial access, and current containment status.

## Categories of Data & Individuals Concerned
Factual categorization of data types, approximate number of data subjects (or 'Under active determination').

## Technical & Organizational Mitigation Measures
Remedial actions deployed to mitigate potential adverse effects and preserve evidentiary integrity.`,
    },
  ];

  for (const t of templates) {
    const existing = await prisma.approvedTemplate.findFirst({
      where: { organizationId: org.id, audience: t.audience },
    });
    if (!existing) {
      await prisma.approvedTemplate.create({
        data: {
          organizationId: org.id,
          audience: t.audience,
          title: t.title,
          mandatorySections: t.mandatorySections,
          templateBody: t.templateBody,
          version: 1,
          isActive: true,
        },
      });
    }
  }
  console.log(`📋 Seeded 5 audience templates`);

  // 4. Organizational Terminology Rules
  const terminologyList = [
    {
      term: 'Security Incident',
      approvedDefinition: 'An adverse event in an information system that endangers system integrity or data availability.',
      forbiddenSynonyms: JSON.stringify(['Disaster', 'Catastrophe', 'Hack Attack', 'Meltdown']),
      category: 'CLASSIFICATION',
    },
    {
      term: 'Under Active Forensics',
      approvedDefinition: 'Rigorous digital forensic analysis currently underway by accredited internal and external investigators.',
      forbiddenSynonyms: JSON.stringify(['Total chaos', 'Completely unknown', 'Out of control']),
      category: 'STATUS',
    },
    {
      term: 'Potential Unauthorized Access',
      approvedDefinition: 'Anomalous telemetry or access patterns under investigation before evidentiary confirmation.',
      forbiddenSynonyms: JSON.stringify(['Massive breach', 'Data stolen', 'Company hacked']),
      category: 'IMPACT',
    },
  ];

  for (const term of terminologyList) {
    const existing = await prisma.organizationalTerminology.findFirst({
      where: { organizationId: org.id, term: term.term },
    });
    if (!existing) {
      await prisma.organizationalTerminology.create({
        data: {
          organizationId: org.id,
          term: term.term,
          approvedDefinition: term.approvedDefinition,
          forbiddenSynonyms: term.forbiddenSynonyms,
          category: term.category,
          isActive: true,
        },
      });
    }
  }
  console.log(`📖 Seeded organizational terminology rules`);

  // 5. Pre-seeded synthetic incident INC-2026-001 (Golden Demo Incident)
  let incident = await prisma.incident.findUnique({
    where: { incidentNumber: 'INC-2026-001' },
  });

  if (!incident) {
    incident = await prisma.incident.create({
      data: {
        incidentNumber: 'INC-2026-001',
        title: 'Critical Zero-Day Remote Code Execution in Perimeter Gateway (CVE-2026-1934)',
        description: 'Perimeter SSL VPN gateways experienced unauthenticated buffer overflow resulting in potential arbitrary code execution. Forensics detected anomalous outbound egress from Gateway Node 2.',
        category: 'ZERO_DAY',
        severity: IncidentSeverity.CRITICAL,
        status: IncidentStatus.ACTIVE,
        organizationId: org.id,
        createdById: createdUsers[Role.INCIDENT_MANAGER],
        discoveryTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        
        accessScopeStatus: EpistemicStatus.UNKNOWN,
        accessScopeDetails: 'Scope of internal network lateral movement is undetermined; forensics analysis of active memory images is underway.',
        
        exfiltrationStatus: EpistemicStatus.SUSPECTED,
        exfiltrationDetails: 'Suspicious 45MB outbound egress observed to unlisted external IP; zero customer records or credentials confirmed exfiltrated to date.',
        
        rootCauseStatus: EpistemicStatus.CONFIRMED,
        rootCauseDetails: 'Heap-based buffer overflow in web service authentication routine (CVE-2026-1934) reachable via TCP port 443.',
        
        affectedSystemsStatus: EpistemicStatus.CONFIRMED,
        affectedSystemsDetails: '4 perimeter PulseGuard VPN appliances (Nodes 1 through 4) isolated from core routing.',
        
        mitigationStatus: EpistemicStatus.SUSPECTED,
        mitigationDetails: 'Emergency vendor hotfix applied to Nodes 1, 2, and 3; Node 4 currently undergoing forensic image capture before patch application.',
        
        regulatoryApplicability: 'GDPR Article 33 (72h supervisory notice window) & SEC Item 1.05 Form 8-K',
      },
    });
  }
  console.log(`🚨 Golden Demo Incident ready: ${incident.incidentNumber} - ${incident.title}`);

  // 6. Audit Trail Initialization
  await prisma.auditLog.create({
    data: {
      organizationId: org.id,
      incidentId: incident.id,
      actorId: createdUsers[Role.INCIDENT_MANAGER],
      actorEmail: 'im@sentinel.defense',
      actorRole: Role.INCIDENT_MANAGER,
      action: 'INCIDENT_CREATED',
      entityType: 'INCIDENT',
      entityId: incident.id,
      metadataJson: JSON.stringify({ severity: incident.severity, title: incident.title }),
    },
  });
  console.log(`🛡️ Audit log initialized for ${incident.incidentNumber}`);

  console.log('✨ Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
