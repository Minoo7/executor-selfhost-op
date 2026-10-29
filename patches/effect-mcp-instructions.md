# Resolve MCP instructions during connection discovery

The Effect 4.0.1 patch accepts `string | Effect.Effect<string>` for MCP server
instructions. Static strings keep their existing behavior. An effect runs once
per `initialize` or stateless `server/discover`, in the dispatching request's context.
Initialization resolves it before a protocol session is registered or saved.
Only the resulting string enters either response.
The session store retains no instructions effect.

The source, distributed JavaScript, and declarations must change together.
`src/ai/McpServer.ts` and its declarations expose the option.
`src/ai/internal/mcpRuntime.ts` resolves it in the initialize lifecycle.
`src/ai/internal/mcpProtocol.ts` carries the dynamic option to the stateless
`v2026_07_28.ts` discovery handler, which resolves it before projecting the result.
The corresponding distributed runtime executes the same code.

Hosted Executor supplies an effect through a request `Context.Reference`, beside
its existing backend and caller references. Authenticated dispatch binds only
that request's database client and resolved organization ID. The cached protocol
server retains the reference lookup, never an organization, SQL client, or
request authority. Tool calls do not acquire the instructions database client or
read the instructions table. A failed settings read refuses connection discovery
instead of silently omitting the organization's guidance. New sessions
on the same grant see the latest stored additions. Existing sessions keep working.

`organization-mcp-instructions.spec.ts` opens a connection before the first save,
then opens new connections with the same key after two revisions and a reset.
It checks the instructions returned by the official MCP client and executes a tool
on an existing session after an edit. It also checks stateless discovery before
and after edits and reset. The lifecycle scenario is registered for
managed Cloud and self-host. A separate Cloud scenario verifies tenant isolation
and browser draft reset when switching organizations, because self-host permits
only one organization. This spec guards the Effect patch in `e2e/ci-selection.ts`.

Regenerate with `bun patch effect@4.0.1`, edit the package, then run
`bun patch --commit node_modules/effect`. Remove Bun tag sections and paths outside
the package, as AGENTS.md requires. Run `bun install --frozen-lockfile`,
`bun run patches:check`, `bun run e2e:prepare`, and the named scenario.
