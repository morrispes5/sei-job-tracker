import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Redirect, router } from "expo-router";
import { useState } from "react";

import {
  apiPaths,
  type ApplicationCreateInput,
  type ApplicationDto,
} from "@sei/shared";

import { useAuth } from "../../src/auth/auth-provider";
import { ApplicationForm } from "../../src/components/application-form";
import { LoadingState, Screen } from "../../src/components/ui";
import { errorMessage } from "../../src/lib/presentation";

export default function NewApplicationScreen() {
  const { state, request } = useAuth();
  const queryClient = useQueryClient();
  const [submitError, setSubmitError] = useState<string>();
  const create = useMutation({
    mutationFn: (input: ApplicationCreateInput) =>
      request<ApplicationDto>(apiPaths.applications.root, {
        method: "POST",
        body: input,
      }),
  });

  if (state.status === "loading") {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }
  if (state.status === "anonymous") {
    return <Redirect href="/login" />;
  }

  async function submit(input: ApplicationCreateInput): Promise<void> {
    setSubmitError(undefined);
    try {
      const application = await create.mutateAsync(input);
      await queryClient.invalidateQueries({
        queryKey: ["mobile-applications"],
      });
      await queryClient.invalidateQueries({ queryKey: ["mobile-dashboard"] });
      router.replace({
        pathname: "/application/[id]",
        params: { id: application.id },
      });
    } catch (error: unknown) {
      setSubmitError(errorMessage(error));
    }
  }

  return (
    <Screen>
      <ApplicationForm
        submitLabel="Simpan application"
        submitting={create.isPending}
        submitError={submitError}
        onSubmit={submit}
      />
    </Screen>
  );
}
