import { executorIntro } from "@executor-js/app-templates/executor";
import { Effect, Schema } from "effect";
import { SqlClient } from "effect/sql";
import type { OrganizationId } from "../contracts/organization.ts";
import {
  OrganizationMcpAdditions,
  OrganizationMcpRevision,
  OrganizationMcpInstructionsConflict,
  OrganizationMcpInstructionsUnavailable,
  composeOrganizationMcpInstructions,
  type OrganizationMcpInstructionsUpdate,
} from "../contracts/organization-mcp-instructions.ts";

const StoredInstructions = Schema.Struct({
  additions: OrganizationMcpAdditions,
  revision: OrganizationMcpRevision,
});
const decodeRows = Schema.decodeUnknownEffect(Schema.Array(StoredInstructions));
const view = (stored: { readonly additions: string; readonly revision: string | null }) => ({
  ...stored,
  upstream: executorIntro,
  combined: composeOrganizationMcpInstructions(executorIntro, stored.additions),
});

export const readOrganizationMcpInstructions = (organization: OrganizationId) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    const rows = yield* sql`select additions, revision from hosted_org_mcp_instructions
      where organization_id = ${organization}`;
    const stored = (yield* decodeRows(rows))[0];
    return view(stored ?? { additions: "", revision: null });
  }).pipe(Effect.mapError(() => new OrganizationMcpInstructionsUnavailable()));

export const saveOrganizationMcpInstructions = (
  organization: OrganizationId,
  input: OrganizationMcpInstructionsUpdate,
) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    const rows = yield* (
      input.expectedRevision === null
        ? sql`insert into hosted_org_mcp_instructions (organization_id, additions)
            values (${organization}, ${input.additions}) on conflict (organization_id) do nothing
            returning additions, revision`
        : sql`update hosted_org_mcp_instructions
            set additions = ${input.additions}, revision = gen_random_uuid()::text
            where organization_id = ${organization} and revision = ${input.expectedRevision}
            returning additions, revision`
    ).pipe(Effect.mapError(() => new OrganizationMcpInstructionsUnavailable()));
    const stored = (yield* decodeRows(rows).pipe(
      Effect.mapError(() => new OrganizationMcpInstructionsUnavailable()),
    ))[0];
    if (stored === undefined) return yield* new OrganizationMcpInstructionsConflict();
    return view(stored);
  });

export const migrateOrganizationMcpInstructions = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  yield* sql`create table hosted_org_mcp_instructions (
    organization_id text primary key references organization(id) on delete cascade,
    additions text not null default '' check (length(additions) <= 8192),
    revision text not null default gen_random_uuid()::text
  )`;
});
