import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";

import {
  apiPaths,
  type ApplicationCreateInput,
  type ApplicationDetailDto,
  type ApplicationDto,
} from "@sei/shared";

import { useAuth } from "../../../src/auth/auth-provider";
import { ApplicationForm } from "../../../src/components/application-form";
import { LoadingState, MessageState, Screen } from "../../../src/components/ui";
import { errorMessage } from "../../../src/lib/presentation";

export default function EditApplicationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, request } = useAuth();
  const queryClient = useQueryClient();
  const [submitError, setSubmitError] = useState<string>();
  const application = useQuery({
    queryKey: ["mobile-application", id],
    queryFn: () =>
      request<ApplicationDetailDto>(apiPaths.applications.byId(id)),
    enabled: Boolean(id) && state.status === "authenticated",
  });
  const update = useMutation({
    mutationFn: (input: ApplicationCreateInput) =>
      request<ApplicationDto>(apiPaths.applications.byId(id), {
        method: "PATCH",
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
  if (application.isLoading) {
    return (
      <Screen>
        <LoadingState label="Memuat application…" />
      </Screen>
    );
  }
  if (application.error || !application.data) {
    return (
      <Screen>
        <MessageState
          title="Application tidak ditemukan"
          message={errorMessage(application.error)}
        />
      </Screen>
    );
  }

  async function submit(input: ApplicationCreateInput): Promise<void> {
    setSubmitError(undefined);
    try {
      await update.mutateAsync(input);
      await queryClient.invalidateQueries({
        queryKey: ["mobile-application", id],
      });
      await queryClient.invalidateQueries({
        queryKey: ["mobile-applications"],
      });
      await queryClient.invalidateQueries({ queryKey: ["mobile-dashboard"] });
      router.replace({ pathname: "/application/[id]", params: { id } });
    } catch (error: unknown) {
      setSubmitError(errorMessage(error));
    }
  }

  return (
    <Screen>
      <ApplicationForm
        initialApplication={application.data}
        submitLabel="Simpan perubahan"
        submitting={update.isPending}
        submitError={submitError}
        onSubmit={submit}
      />
    </Screen>
  );
}
