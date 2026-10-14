import { useAtomSet, useAtomValue } from "@effect/atom-react";
import type { AccountId } from "@executor-js/sdk";
import type { AccountAccess } from "@executor-js/hosted-server/resource-access";
import { Button } from "@executor-js/ui/components/button";
import { QueryView } from "@executor-js/ui/dashboard/context";
import { DetailSkeleton } from "@executor-js/ui/dashboard/loading";
import { Exit, Option, type Cause } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useState } from "react";
import { sessionAtom } from "../../contracts/auth.ts";
import type { HostedError } from "../../contracts/errors.ts";
import { accountAccessAtom, makeAccountPersonalAtom } from "../../contracts/resource-access.ts";
import { HostedFailure } from "../components/dashboard-bindings.tsx";
import { useOrganizationRoute } from "../components/organization.tsx";

type Props = {
  readonly account: AccountId;
  readonly onPendingChange: (pending: boolean) => void;
  readonly onClose: () => void;
};

export function MakeAccountPersonal(props: Props) {
  const { organization } = useOrganizationRoute();
  return (
    <QueryView
      query={accountAccessAtom({ organization, account: props.account })}
      Failure={HostedFailure}
      pending={<DetailSkeleton label="Loading account access" />}
    >
      {(access) => <Confirmation {...props} access={access} />}
    </QueryView>
  );
}

function Confirmation({
  access,
  ...props
}: Props & { readonly access: typeof AccountAccess.Type }) {
  const { organization } = useOrganizationRoute();
  const save = useAtomSet(makeAccountPersonalAtom({ organization, account: props.account }), {
    mode: "promiseExit",
  });
  const session = AsyncResult.value(useAtomValue(sessionAtom));
  const user = Option.isSome(session) ? session.value?.user.id : undefined;
  const [revision, setRevision] = useState(access.revision);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<Cause.Cause<HostedError>>();
  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        props.onPendingChange(true);
        setError(undefined);
        const result = await save({ revision });
        setPending(false);
        props.onPendingChange(false);
        if (Exit.isFailure(result)) setError(result.cause);
        else props.onClose();
      }}
    >
      <p className="text-sm text-muted-foreground">
        Only you will be able to use this account directly and manage it. Other members' personal
        links lose access. App-wide links still let people use it through those apps; unlink them in
        each app to stop that access. Credentials and saved links stay intact. Calls already running
        may finish. You can share it again later.
      </p>
      {error && <HostedFailure cause={error} />}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          loading={pending}
          disabledReason={
            access.canManage && access.creator === user
              ? undefined
              : "Only the original account creator can make it personal."
          }
        >
          Make personal
        </Button>
        {error && (
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => {
              setRevision(access.revision);
              setError(undefined);
            }}
          >
            Reset changes
          </Button>
        )}
        <Button type="button" variant="ghost" disabled={pending} onClick={props.onClose}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
