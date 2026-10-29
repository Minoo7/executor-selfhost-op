import { ApiError } from "@executor-js/utils/api-error";
import { Schema } from "effect";

export const organizationMcpInstructionsMaxLength = 8192;
export const OrganizationMcpAdditions = Schema.String.check(
  Schema.isMaxLength(organizationMcpInstructionsMaxLength),
);
export const OrganizationMcpRevision = Schema.String.check(Schema.isUUID(4));
export const OrganizationMcpInstructionsUpdate = Schema.Struct({
  additions: OrganizationMcpAdditions,
  expectedRevision: Schema.NullOr(OrganizationMcpRevision),
});
export type OrganizationMcpInstructionsUpdate = typeof OrganizationMcpInstructionsUpdate.Type;
export const OrganizationMcpInstructions = Schema.Struct({
  additions: OrganizationMcpAdditions,
  revision: Schema.NullOr(OrganizationMcpRevision),
  upstream: Schema.String,
  combined: Schema.String,
});
export type OrganizationMcpInstructions = typeof OrganizationMcpInstructions.Type;

export const OrganizationMcpInstructionsConflict = ApiError.define({
  tag: "OrganizationMcpInstructionsConflict",
  status: 409,
  message:
    "These instructions changed since you loaded them. Copy your draft, reload, and try again.",
});
export const OrganizationMcpInstructionsUnavailable = ApiError.define({
  tag: "OrganizationMcpInstructionsUnavailable",
  status: 503,
  message: "Unable to load or save organization MCP instructions. Try again.",
});
export type OrganizationMcpInstructionsUnavailable =
  typeof OrganizationMcpInstructionsUnavailable.Type;

export const composeOrganizationMcpInstructions = (upstream: string, additions: string) =>
  additions.length === 0 ? upstream : `${upstream}\n\n${additions}`;
