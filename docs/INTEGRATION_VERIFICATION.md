# Integration Verification Log

**Date Fetched**: 2026-11-16  
**Session Operator**: Antigravity Principal Engineer  
**Standard**: Real official documentation fetched live; zero speculation; contract-faithful fakes for offline unit testing only.

---

## 1. Firecrawl (Web Intelligence Provider)

* **Documentation Sources**:
  * https://firecrawl.dev
  * https://docs.firecrawl.dev (v1 API Reference)
  * npm package: `firecrawl` (formerly `@mendable/firecrawl-js`)
* **Package**: `firecrawl`
* **Authentication Method**:
  * Environment variable `FIRECRAWL_API_KEY` (format: `fc-...`)
  * SDK Constructor: `new Firecrawl({ apiKey?: string, apiUrl?: string })`
  * API Header: `Authorization: Bearer <FIRECRAWL_API_KEY>`
* **Primary Endpoints & SDK Methods**:
  * `scrape(url: string, options?: ScrapeOptions): Promise<ScrapeResponse>`
    * Endpoint: `POST /v1/scrape`
    * Options: `formats: ['markdown', 'html', 'rawHtml', 'links']`, `onlyMainContent: boolean`, `waitFor: number`, `headers: Record<string, string>`
    * Response Shape:
      ```typescript
      interface FirecrawlScrapeResponse {
        success: boolean;
        data?: {
          markdown?: string;
          html?: string;
          rawHtml?: string;
          metadata?: {
            title?: string;
            description?: string;
            sourceURL?: string;
            statusCode?: number;
            error?: string;
            [key: string]: unknown;
          };
          links?: string[];
        };
        error?: string;
      }
      ```
  * `crawl(url: string, options?: CrawlOptions): Promise<CrawlResponse>`
    * Endpoint: `POST /v1/crawl` & `GET /v1/crawl/{id}`
    * Options: `limit: number`, `pollInterval: number`, `scrapeOptions: ScrapeOptions`
* **Rate Limits & Constraints**:
  * Free/Keyless tier: Limited requests/min, concurrency 1-2.
  * Standard tier: 10-50 requests/min; rate limit response HTTP 429 with `Retry-After`.
* **Security & Prompt Injection Defenses**:
  * Unsanitized external web content must be quarantined.
  * Delimited markdown blocks `<external_advisory id="...">...</external_advisory>` inside LLM extraction prompts with strict instruction hierarchy.
  * Server-side domain allowlist verification before initiating any scrape/crawl.

---

## 2. Memento vs. Local Memory Provider

* **Verification Research**:
  * **Candidate 1: Mem0 (`mem0.ai` / `@mem0/memory`)**: Multi-tiered memory engine for LLM agents supporting user, session, and organizational memory with vector-based semantic retrieval.
  * **Candidate 2: runmemento.com / `memento-memory`**: Bitemporal knowledge graph memory store for AI agents designed for structured scopes, kinds, and audit logs.
  * **Candidate 3: Local Postgres + pgvector (`LocalMemoryAdapter`)**: Built-in memory provider using PostgreSQL tables `ApprovedTemplate` and `OrganizationalTerminology` with pgvector embeddings, cosine similarity search, and tenant isolation.
* **Architecture Decision**:
  * Provide an abstract `MemoryProvider` interface.
  * Default implementation: `LocalMemoryAdapter` with a visible UI badge: **"Local adapter, not Memento"**.
  * Awaiting user checkpoint decision on whether to connect an external Memento / Mem0 instance or utilize the verified `LocalMemoryAdapter`.

---

## 3. Auth.js (NextAuth.js v5 App Router)

* **Documentation Sources**:
  * https://authjs.dev/getting-started/installation
  * https://authjs.dev/reference/nextjs
  * npm packages: `next-auth@beta`, `@auth/prisma-adapter`
* **Architecture Pattern**:
  * Edge-compatible middleware split: `auth.config.ts` (Edge-safe providers/callbacks) vs. `auth.ts` (Prisma adapter with Node.js runtime).
  * API Route Handler: `app/api/auth/[...nextauth]/route.ts` exporting `{ GET, POST }`.
  * Session Strategy: JWT session with embedded `role` (`INCIDENT_MANAGER | SECURITY_LEAD | COMMUNICATIONS_OFFICER | LEGAL_COUNSEL | EXECUTIVE_REVIEWER | AUDITOR`) and `organizationId`.
  * Route & Action Authorization: Centralized `authorize(user, action, resource)` function evaluating permissions deterministically.

---

## 4. Prisma ORM & pgvector

* **Documentation Sources**:
  * https://www.prisma.io/docs/orm/prisma-schema/data-model/models#postgresql-extensions
  * PostgreSQL `pgvector` extension documentation: `CREATE EXTENSION IF NOT EXISTS vector;`
* **Schema Definition**:
  * Model column: `embedding Unsupported("vector(1536)")?` or `Unsupported("vector(768)")?` depending on embedding model dimensions.
  * Vector search query mechanism: Prisma `$queryRaw` using `<=>` (cosine distance) or `<->` (L2 distance) with tenant filtering:
    ```sql
    SELECT id, title, content, 1 - (embedding <=> $1::vector) AS similarity
    FROM "ApprovedTemplate"
    WHERE "organizationId" = $2 AND "isActive" = true
    ORDER BY similarity DESC
    LIMIT $3;
    ```
* **Database Target**:
  * Managed Neon PostgreSQL instance (Project `quiet-resonance-78100860`, Region `aws-ap-southeast-1`, Postgres 18).

---

## 5. LLM SDK (Vercel AI SDK + Google / OpenAI Providers)

* **Documentation Sources**:
  * https://sdk.vercel.ai/docs/reference/ai-sdk-core/generate-object
  * npm packages: `ai`, `@ai-sdk/google`, `@ai-sdk/openai`, `zod`
* **Features & Patterns**:
  * Structured Outputs: `generateObject({ model, schema: zodSchema, prompt, temperature })`.
  * Deterministic validation: If schema fails, automatic retry with validation error feedback.
  * Multi-model verifier separation: Generator model and independent Verifier model run at isolated temperatures and scopes.
