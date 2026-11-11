import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import {
  composeOrganizationMcpInstructions,
  organizationMcpInstructionsMaxLength,
  type OrganizationMcpInstructions,
  type OrganizationMcpInstructionsUpdate,
} from "@executor-js/hosted-server/organization-mcp-instructions";
import { Button } from "@executor-js/ui/components/button";
import { Textarea } from "@executor-js/ui/components/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@executor-js/ui/components/card";
import { Exit, Option } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useState } from "react";
import {
  organizationMcpInstructionsAtom,
  saveOrganizationMcpInstructionsAtom,
} from "../../contracts/organization.ts";
import { organizationError, useOrganization } from "./organization.tsx";
import { organizationSettingClass } from "./organization-settings-pending.tsx";

export function OrganizationMcpInstructionsCard({ disabled }: { readonly disabled: boolean }) {
  const organization = useOrganization();
  const query = organizationMcpInstructionsAtom(organization.organization);
  const state = useAtomValue(query);
  const refresh = useAtomRefresh(query);
  const value = AsyncResult.value(state);
  return (
    <Card className={organizationSettingClass}>
      <CardHeader>
        <CardTitle>
          <h2>MCP instructions</h2>
        </CardTitle>
        <CardDescription>
          Add guidance for agents using this organization. Executor appends it to the current
          upstream instructions. Reconnect your MCP client after saving to receive the changes.
        </CardDescription>
      </CardHeader>
      {AsyncResult.isFailure(state) && (
        <CardContent>
          <p role="alert">Unable to load MCP instructions.</p>
          <Button variant="outline" onClick={refresh}>
            Try again
          </Button>
        </CardContent>
      )}
      {Option.isSome(value) ? (
        <InstructionsEditor
          key={organization.organization}
          instructions={value.value}
          disabled={disabled}
        />
      ) : !AsyncResult.isFailure(state) ? (
        <CardContent>
          <p role="status">Loading MCP instructions</p>
        </CardContent>
      ) : null}
    </Card>
  );
}

function InstructionsEditor({
  instructions,
  disabled,
}: {
  readonly instructions: OrganizationMcpInstructions;
  readonly disabled: boolean;
}) {
  const organization = useOrganization();
  const mutation = saveOrganizationMcpInstructionsAtom(organization.organization);
  const save = useAtomSet(mutation, { mode: "promiseExit" });
  const state = useAtomValue(mutation);
  const [draft, setDraft] = useState<OrganizationMcpInstructionsUpdate>();
  const [feedback, setFeedback] = useState<
    { readonly kind: "saved" } | { readonly kind: "error"; readonly message: string }
  >();
  const additions = draft?.additions ?? instructions.additions;
  const disabledReason =
    organization.role === "member"
      ? "Only organization owners and admins can change MCP instructions."
      : undefined;
  const pending = disabled || state.waiting;
  const edit = (additions: string): OrganizationMcpInstructionsUpdate => ({
    additions,
    expectedRevision: draft === undefined ? instructions.revision : draft.expectedRevision,
  });
  const submit = async (input: OrganizationMcpInstructionsUpdate) => {
    if (pending || disabledReason !== undefined) return;
    setDraft(draft ?? edit(additions));
    setFeedback(undefined);
    const result = await save(input);
    if (Exit.isFailure(result))
      setFeedback({ kind: "error", message: organizationError(result.cause) });
    else {
      setDraft(undefined);
      setFeedback({ kind: "saved" });
    }
  };
  return (
    <form
      aria-label="MCP instructions"
      onSubmit={(event) => {
        event.preventDefault();
        void submit(edit(additions));
      }}
    >
      <CardContent>
        <Textarea
          aria-label="Organization MCP additions"
          aria-describedby="mcp-instructions-hint"
          value={additions}
          maxLength={organizationMcpInstructionsMaxLength}
          disabled={pending}
          disabledReason={disabledReason}
          onChange={(event) => {
            setDraft(edit(event.target.value));
            setFeedback(undefined);
          }}
          rows={8}
        />
        <details className="mt-3">
          <summary>Combined MCP instructions preview</summary>
          <pre
            aria-label="Combined MCP instructions"
            className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap break-words text-xs"
          >
            {composeOrganizationMcpInstructions(instructions.upstream, additions)}
          </pre>
        </details>
        {feedback?.kind === "error" && (
          <p role="alert" className="mt-3 text-destructive text-sm">
            {feedback.message}
          </p>
        )}
      </CardContent>
      <CardFooter>
        <p id="mcp-instructions-hint">
          {additions.length} / {organizationMcpInstructionsMaxLength} characters
        </p>
        <div className="flex items-center gap-2.5">
          {feedback?.kind === "saved" && <span role="status">Saved</span>}
          <Button
            type="button"
            variant="outline"
            disabled={pending || (additions.length === 0 && instructions.additions.length === 0)}
            disabledReason={disabledReason}
            onClick={() => {
              void submit(edit(""));
            }}
          >
            Reset to upstream
          </Button>
          <Button
            type="submit"
            variant="outline"
            loading={state.waiting}
            disabled={pending || additions === instructions.additions}
            disabledReason={disabledReason}
          >
            Save
          </Button>
        </div>
      </CardFooter>
    </form>
  );
}
