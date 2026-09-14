import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Archive,
  ArrowLeft,
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  FilePenLine,
  Plus,
  Search,
  Trash2,
  UserRoundPlus,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";

import {
  apiPaths,
  type ApplicationContactCreateInput,
  type ApplicationCreateInput,
  type ApplicationDetailDto,
  type ApplicationDto,
  type ApplicationListResponse,
  type ApplicationStatus,
  type AuthLoginInput,
  type AuthRegisterInput,
} from "@sei/shared";

import { useAuth } from "./auth/auth-provider";
import { ApplicationForm } from "./components/application-form";
import {
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  FieldError,
  LoadingState,
  Panel,
  StatusBadge,
} from "./components/ui";
import { type ApplicationListParams } from "./lib/api";
import {
  activityLabel,
  errorMessage,
  formatCurrency,
  formatDate,
  statusLabel,
} from "./lib/presentation";

const statuses: ApplicationStatus[] = [
  "WISHLIST",
  "APPLIED",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
];

function listPath(query: ApplicationListParams = {}): string {
  const search = new URLSearchParams(
    Object.entries(query)
      .filter(([, value]) => value !== undefined && value !== "")
      .map(([key, value]) => [key, String(value)]),
  ).toString();

  return search
    ? `${apiPaths.applications.root}?${search}`
    : apiPaths.applications.root;
}

function useApplicationList(query: ApplicationListParams) {
  const { request } = useAuth();
  return useQuery({
    queryKey: ["applications", query],
    queryFn: () => request<ApplicationListResponse>(listPath(query)),
  });
}

export function LoginPage() {
  return <AuthPage mode="login" />;
}

export function RegisterPage() {
  return <AuthPage mode="register" />;
}

function AuthPage({ mode }: { mode: "login" | "register" }) {
  const { state } = useAuth();

  if (state.status === "loading") {
    return <FullPageLoading label="Memeriksa session amanmu…" />;
  }

  return <AuthScreen mode={mode} />;
}

function AuthScreen({ mode }: { mode: "login" | "register" }) {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const loginForm = useForm<AuthLoginInput>({
    defaultValues: { email: "", password: "" },
  });
  const registerForm = useForm<AuthRegisterInput>({
    defaultValues: {
      email: "",
      password: "",
      displayName: "",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    },
  });
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function submitLogin(input: AuthLoginInput) {
    setError(undefined);
    setPending(true);
    try {
      await login(input);
      await navigate({ to: "/" });
    } catch (nextError: unknown) {
      setError(errorMessage(nextError));
    } finally {
      setPending(false);
    }
  }

  async function submitRegister(input: AuthRegisterInput) {
    setError(undefined);
    setPending(true);
    try {
      await register(input);
      await navigate({ to: "/" });
    } catch (nextError: unknown) {
      setError(errorMessage(nextError));
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#090b10] px-5 py-10 text-[#f4f7fb]">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/8 bg-[#11151d] shadow-2xl lg:grid-cols-[1.1fr_0.9fr]">
        <section className="hidden border-r border-white/8 bg-[radial-gradient(circle_at_top_left,_rgba(91,140,255,.22),_transparent_42%)] p-10 lg:block">
          <img
            alt="Sei abstract compass mark"
            src="/sei-mark.svg"
            className="size-13"
          />
          <p className="mt-12 text-xs font-semibold uppercase tracking-[0.16em] text-[#82a7ff]">
            Sei — Job Tracker
          </p>
          <h1 className="mt-4 max-w-sm text-4xl font-semibold tracking-tight text-white">
            Jadikan proses melamar lebih terlihat dan terarah.
          </h1>
          <p className="mt-5 max-w-sm leading-7 text-slate-400">
            Simpan peluang, deadline, kontak, dan setiap perubahan status dalam
            satu ruang kendali pribadi.
          </p>
          <div className="mt-12 rounded-2xl border border-white/8 bg-black/15 p-5 text-sm text-slate-300">
            <p className="font-semibold text-white">Session dirancang aman</p>
            <p className="mt-2 leading-6 text-slate-400">
              Access token hanya disimpan di memory browser. Refresh session
              berada di cookie httpOnly.
            </p>
          </div>
        </section>
        <section className="p-6 sm:p-10">
          <div className="lg:hidden">
            <img
              alt="Sei abstract compass mark"
              src="/sei-mark.svg"
              className="size-10"
            />
          </div>
          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.16em] text-[#82a7ff]">
            {mode === "login" ? "Welcome back" : "Mulai dengan Sei"}
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
            {mode === "login" ? "Masuk ke tracker-mu" : "Buat ruang kendalimu"}
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            {mode === "login"
              ? "Lanjutkan dari application terakhir yang kamu kelola."
              : "Gunakan email aktif untuk menyimpan proses lamaranmu dengan aman."}
          </p>
          {error ? (
            <div
              role="alert"
              className="mt-6 rounded-xl border border-rose-300/20 bg-rose-400/8 px-4 py-3 text-sm text-rose-100"
            >
              {error}
            </div>
          ) : null}
          {mode === "login" ? (
            <form
              className="mt-8 space-y-5"
              onSubmit={loginForm.handleSubmit(submitLogin)}
            >
              <AuthField
                label="Email"
                error={loginForm.formState.errors.email?.message}
              >
                <input
                  className="input"
                  type="email"
                  autoComplete="email"
                  placeholder="nama@email.com"
                  {...loginForm.register("email", {
                    required: "Email wajib diisi",
                  })}
                />
              </AuthField>
              <AuthField
                label="Password"
                error={loginForm.formState.errors.password?.message}
              >
                <input
                  className="input"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Minimal 12 karakter"
                  {...loginForm.register("password", {
                    required: "Password wajib diisi",
                  })}
                />
              </AuthField>
              <Button type="submit" className="mt-2 w-full" disabled={pending}>
                {pending ? "Memeriksa…" : "Masuk"}
              </Button>
            </form>
          ) : (
            <form
              className="mt-8 space-y-5"
              onSubmit={registerForm.handleSubmit(submitRegister)}
            >
              <AuthField
                label="Nama tampilan"
                error={registerForm.formState.errors.displayName?.message}
              >
                <input
                  className="input"
                  autoComplete="name"
                  placeholder="Morriz"
                  {...registerForm.register("displayName", {
                    required: "Nama wajib diisi",
                  })}
                />
              </AuthField>
              <AuthField
                label="Email"
                error={registerForm.formState.errors.email?.message}
              >
                <input
                  className="input"
                  type="email"
                  autoComplete="email"
                  placeholder="nama@email.com"
                  {...registerForm.register("email", {
                    required: "Email wajib diisi",
                  })}
                />
              </AuthField>
              <AuthField
                label="Password"
                error={registerForm.formState.errors.password?.message}
              >
                <input
                  className="input"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Minimal 12 karakter"
                  {...registerForm.register("password", {
                    required: "Password wajib diisi",
                    minLength: { value: 12, message: "Minimal 12 karakter" },
                  })}
                />
              </AuthField>
              <Button type="submit" className="mt-2 w-full" disabled={pending}>
                {pending ? "Membuat akun…" : "Buat akun"}
              </Button>
            </form>
          )}
          <p className="mt-7 text-center text-sm text-slate-400">
            {mode === "login" ? "Belum punya akun?" : "Sudah punya akun?"}{" "}
            <button
              type="button"
              className="font-semibold text-[#9dbaff] underline-offset-4 hover:underline"
              onClick={() => {
                setError(undefined);
                void navigate({
                  to: mode === "login" ? "/register" : "/login",
                });
              }}
            >
              {mode === "login" ? "Buat akun" : "Masuk"}
            </button>
          </p>
        </section>
      </div>
    </main>
  );
}

export function DashboardPage() {
  const { request } = useAuth();
  const statusQueries = useQueries({
    queries: statuses.map((status) => ({
      queryKey: ["dashboard", "status", status],
      queryFn: () =>
        request<ApplicationListResponse>(listPath({ status, limit: 1 })),
    })),
  });
  const upcoming = useQuery({
    queryKey: ["dashboard", "upcoming"],
    queryFn: () =>
      request<ApplicationListResponse>(
        listPath({
          limit: 5,
          sort: "deadlineAt_asc",
          deadlineFrom: new Date().toISOString(),
        }),
      ),
  });
  const recent = useQuery({
    queryKey: ["dashboard", "recent"],
    queryFn: () =>
      request<ApplicationListResponse>(
        listPath({ limit: 6, sort: "updatedAt_desc" }),
      ),
  });
  const dueSoon = useQuery({
    queryKey: ["dashboard", "due-soon"],
    queryFn: () =>
      request<ApplicationListResponse>(
        listPath({
          limit: 1,
          deadlineFrom: new Date().toISOString(),
          deadlineTo: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        }),
      ),
  });
  const loading =
    statusQueries.some((query) => query.isLoading) ||
    upcoming.isLoading ||
    recent.isLoading ||
    dueSoon.isLoading;
  const error =
    statusQueries.find((query) => query.isError)?.error ??
    upcoming.error ??
    recent.error ??
    dueSoon.error;
  const counts = Object.fromEntries(
    statuses.map((status, index) => [
      status,
      statusQueries[index]?.data?.meta.total ?? 0,
    ]),
  ) as Record<ApplicationStatus, number>;
  const activeTotal =
    counts.WISHLIST + counts.APPLIED + counts.INTERVIEW + counts.OFFER;

  if (loading) return <LoadingState label="Menyusun dashboard…" />;
  if (error)
    return (
      <ErrorState
        message={errorMessage(error)}
        onRetry={() =>
          void Promise.all([
            ...statusQueries.map((query) => query.refetch()),
            upcoming.refetch(),
            recent.refetch(),
            dueSoon.refetch(),
          ])
        }
      />
    );

  const hasApplications =
    recent.data?.meta.total || upcoming.data?.meta.total || activeTotal;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Dashboard"
        title="Fokus pada langkah berikutnya."
        description="Pipeline aktif, deadline mendatang, dan update terbaru dari application-mu."
        action={
          <Link
            to="/applications/new"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#5b8cff] px-4 text-sm font-semibold text-[#06132e] hover:bg-[#82a7ff]"
          >
            <Plus className="size-4" />
            Tambah application
          </Link>
        }
      />
      {!hasApplications ? (
        <EmptyState
          title="Belum ada application"
          description="Mulai dari satu peluang yang ingin kamu ingat. Sei akan membantu menjaga deadline dan progresnya tetap terlihat."
          action={
            <Link
              to="/applications/new"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#5b8cff] px-4 text-sm font-semibold text-[#06132e]"
            >
              <Plus className="size-4" />
              Tambah application
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              label="Active pipeline"
              value={activeTotal}
              detail="Wishlist sampai offer"
              icon={<BriefcaseBusiness />}
            />
            <Metric
              label="Interview"
              value={counts.INTERVIEW}
              detail="Butuh persiapan"
              icon={<ClipboardList />}
            />
            <Metric
              label="Offer"
              value={counts.OFFER}
              detail="Tahap keputusan"
              icon={<ArrowUpRight />}
            />
            <Metric
              label="Due 7 hari"
              value={dueSoon.data?.meta.total ?? 0}
              detail="Deadline berikutnya"
              icon={<CalendarClock />}
            />
          </div>
          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <Panel className="p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#82a7ff]">
                    Upcoming
                  </p>
                  <h2 className="mt-2 text-lg font-semibold text-white">
                    Deadline mendatang
                  </h2>
                </div>
                <Link
                  to="/applications"
                  className="text-sm font-semibold text-[#9dbaff] hover:text-white"
                >
                  Lihat semua
                </Link>
              </div>
              <div className="mt-5 divide-y divide-white/7">
                {upcoming.data?.data.length ? (
                  upcoming.data.data.map((application) => (
                    <UpcomingRow
                      key={application.id}
                      application={application}
                    />
                  ))
                ) : (
                  <p className="py-8 text-sm text-slate-500">
                    Belum ada deadline mendatang.
                  </p>
                )}
              </div>
            </Panel>
            <Panel className="p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#82a7ff]">
                    Recent
                  </p>
                  <h2 className="mt-2 text-lg font-semibold text-white">
                    Update terakhir
                  </h2>
                </div>
                <Link
                  to="/applications"
                  className="text-sm font-semibold text-[#9dbaff] hover:text-white"
                >
                  Applications
                </Link>
              </div>
              <div className="mt-5 space-y-3">
                {recent.data?.data.map((application) => (
                  <RecentCard key={application.id} application={application} />
                ))}
              </div>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}

export function ApplicationsPage() {
  const [filters, setFilters] = useState<ApplicationListParams>({
    archived: "false",
    page: 1,
    limit: 20,
    sort: "updatedAt_desc",
  });
  const [search, setSearch] = useState("");
  const list = useApplicationList(filters);
  const data = list.data;

  function patchFilters(next: Partial<ApplicationListParams>) {
    setFilters((current) => ({ ...current, ...next, page: next.page ?? 1 }));
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Applications"
        title={
          filters.archived === "true"
            ? "Arsip application"
            : "Kelola setiap peluang"
        }
        description="Cari, update progres, atau buka detail untuk catatan dan kontak."
        action={
          <Link
            to="/applications/new"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#5b8cff] px-4 text-sm font-semibold text-[#06132e] hover:bg-[#82a7ff]"
          >
            <Plus className="size-4" />
            Tambah
          </Link>
        }
      />
      <Panel className="p-4 sm:p-5">
        <form
          className="grid gap-3 lg:grid-cols-[1.6fr_repeat(2,0.8fr)_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            patchFilters({ q: search });
          }}
        >
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
            <input
              className="input pl-10"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari role atau perusahaan"
            />
          </label>
          <select
            className="input"
            value={filters.status ?? ""}
            onChange={(event) =>
              patchFilters({ status: event.target.value || undefined })
            }
          >
            <option value="">Semua status</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {statusLabel(status)}
              </option>
            ))}
          </select>
          <select
            className="input"
            value={filters.type ?? ""}
            onChange={(event) =>
              patchFilters({ type: event.target.value || undefined })
            }
          >
            <option value="">Semua jenis</option>
            <option value="JOB">Job</option>
            <option value="INTERNSHIP">Internship</option>
            <option value="FREELANCE">Freelance</option>
          </select>
          <Button type="submit" variant="secondary">
            Terapkan
          </Button>
        </form>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            className="text-sm font-medium text-[#9dbaff] hover:text-white"
            onClick={() =>
              patchFilters({
                archived: filters.archived === "true" ? "false" : "true",
              })
            }
          >
            {filters.archived === "true" ? "Kembali ke aktif" : "Lihat arsip"}
          </button>
          <select
            aria-label="Urutkan application"
            className="rounded-lg border border-white/10 bg-[#181e29] px-3 py-2 text-sm text-slate-300"
            value={filters.sort}
            onChange={(event) => patchFilters({ sort: event.target.value })}
          >
            <option value="updatedAt_desc">Terakhir diubah</option>
            <option value="deadlineAt_asc">Deadline terdekat</option>
            <option value="createdAt_desc">Terbaru dibuat</option>
          </select>
        </div>
      </Panel>
      {list.isLoading ? (
        <LoadingState />
      ) : list.isError ? (
        <ErrorState
          message={errorMessage(list.error)}
          onRetry={() => void list.refetch()}
        />
      ) : data?.data.length ? (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-white/8 bg-[#11151d] lg:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/8 bg-white/[0.025] text-xs uppercase tracking-[0.11em] text-slate-500">
                <tr>
                  <th className="px-6 py-4">Application</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4">Deadline</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/7">
                {data.data.map((application) => (
                  <tr key={application.id} className="hover:bg-white/[0.025]">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-white">
                        {application.title}
                      </p>
                      <p className="mt-1 text-slate-500">
                        {application.organizationName} · {application.type}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={application.status} />
                    </td>
                    <td className="px-4 py-4 text-slate-300">
                      {formatDate(application.deadlineAt, {
                        day: "numeric",
                        month: "short",
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to="/applications/$applicationId"
                        params={{ applicationId: application.id }}
                        className="font-semibold text-[#9dbaff] hover:text-white"
                      >
                        Buka
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 lg:hidden">
            {data.data.map((application) => (
              <RecentCard key={application.id} application={application} />
            ))}
          </div>
          <Pagination
            meta={data.meta}
            onPage={(page) => patchFilters({ page })}
          />
        </>
      ) : (
        <EmptyState
          title={
            filters.archived === "true"
              ? "Arsip masih kosong"
              : "Belum ada application"
          }
          description={
            filters.q || filters.status || filters.type
              ? "Coba ubah filter atau kata kuncinya."
              : "Tambahkan peluang pertama agar pipeline-mu mulai terbentuk."
          }
          action={
            filters.archived === "true" ? undefined : (
              <Link
                to="/applications/new"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#5b8cff] px-4 text-sm font-semibold text-[#06132e]"
              >
                <Plus className="size-4" />
                Tambah application
              </Link>
            )
          }
        />
      )}
    </div>
  );
}

export function ApplicationCreatePage() {
  return <ApplicationFormPage mode="create" />;
}
export function ApplicationEditPage({
  applicationId,
}: {
  applicationId: string;
}) {
  return <ApplicationFormPage mode="edit" applicationId={applicationId} />;
}

function ApplicationFormPage({
  mode,
  applicationId,
}: {
  mode: "create" | "edit";
  applicationId?: string;
}) {
  const { request } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string>();
  const detail = useQuery({
    enabled: mode === "edit" && Boolean(applicationId),
    queryKey: ["application", applicationId],
    queryFn: () =>
      request<ApplicationDetailDto>(apiPaths.applications.byId(applicationId!)),
  });
  const mutation = useMutation({
    mutationFn: async (input: ApplicationCreateInput) =>
      mode === "create"
        ? request<ApplicationDto>(apiPaths.applications.root, {
            method: "POST",
            body: input,
          })
        : request<ApplicationDto>(apiPaths.applications.byId(applicationId!), {
            method: "PATCH",
            body: input,
          }),
  });

  if (mode === "edit" && detail.isLoading)
    return <LoadingState label="Memuat application…" />;
  if (mode === "edit" && detail.isError)
    return (
      <ErrorState
        message={errorMessage(detail.error)}
        onRetry={() => void detail.refetch()}
      />
    );

  async function onSubmit(input: ApplicationCreateInput) {
    setSubmitError(undefined);
    try {
      const application = await mutation.mutateAsync(input);
      await queryClient.invalidateQueries({ queryKey: ["applications"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      await navigate({
        to: "/applications/$applicationId",
        params: { applicationId: application.id },
      });
    } catch (error: unknown) {
      setSubmitError(errorMessage(error));
    }
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow={mode === "create" ? "New application" : "Edit application"}
        title={
          mode === "create"
            ? "Tambahkan peluang baru"
            : `Perbarui ${detail.data?.title ?? "application"}`
        }
        description="Simpan informasi yang benar-benar membantu langkah berikutnya; field lain bisa kamu lengkapi nanti."
        action={
          mode === "edit" && applicationId ? (
            <Link
              to="/applications/$applicationId"
              params={{ applicationId }}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-semibold text-slate-200 hover:bg-white/5"
            >
              <ArrowLeft className="size-4" />
              Kembali
            </Link>
          ) : (
            <Link
              to="/applications"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-semibold text-slate-200 hover:bg-white/5"
            >
              <ArrowLeft className="size-4" />
              Kembali
            </Link>
          )
        }
      />
      <ApplicationForm
        initialApplication={detail.data}
        submitLabel={
          mode === "create" ? "Simpan application" : "Simpan perubahan"
        }
        submitting={mutation.isPending}
        submitError={submitError}
        onSubmit={onSubmit}
      />
    </div>
  );
}

export function ApplicationDetailPage({
  applicationId,
}: {
  applicationId: string;
}) {
  const { request } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const detail = useQuery({
    queryKey: ["application", applicationId],
    queryFn: () =>
      request<ApplicationDetailDto>(apiPaths.applications.byId(applicationId)),
  });
  const [confirm, setConfirm] = useState<{
    kind: "application" | "note" | "contact";
    id?: string;
  }>();
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState<string>();
  const noteForm = useForm<{ body: string }>({ defaultValues: { body: "" } });
  const contactForm = useForm<ApplicationContactCreateInput>({
    defaultValues: { name: "", role: null, email: null, profileUrl: null },
  });

  const refreshDetail = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["application", applicationId],
    });
    await queryClient.invalidateQueries({ queryKey: ["applications"] });
    await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  if (detail.isLoading)
    return <LoadingState label="Membuka detail application…" />;
  if (detail.isError || !detail.data)
    return (
      <ErrorState
        message={errorMessage(detail.error)}
        onRetry={() => void detail.refetch()}
      />
    );
  const application = detail.data;

  async function patchStatus(status: ApplicationStatus) {
    setActionError(undefined);
    try {
      await request<ApplicationDto>(apiPaths.applications.byId(applicationId), {
        method: "PATCH",
        body: { status },
      });
      await refreshDetail();
    } catch (error: unknown) {
      setActionError(errorMessage(error));
    }
  }
  async function toggleArchive() {
    setActionError(undefined);
    try {
      await request<ApplicationDto>(
        application.archivedAt
          ? apiPaths.applications.restore(applicationId)
          : apiPaths.applications.archive(applicationId),
        { method: "POST" },
      );
      await refreshDetail();
    } catch (error: unknown) {
      setActionError(errorMessage(error));
    }
  }
  async function addNote(input: { body: string }) {
    setActionError(undefined);
    try {
      await request(apiPaths.applications.notes(applicationId), {
        method: "POST",
        body: input,
      });
      noteForm.reset();
      await refreshDetail();
    } catch (error: unknown) {
      setActionError(errorMessage(error));
    }
  }
  async function addContact(input: ApplicationContactCreateInput) {
    setActionError(undefined);
    try {
      await request(apiPaths.applications.contacts(applicationId), {
        method: "POST",
        body: input,
      });
      contactForm.reset();
      await refreshDetail();
    } catch (error: unknown) {
      setActionError(errorMessage(error));
    }
  }
  async function runConfirmation() {
    if (!confirm) return;
    setPending(true);
    setActionError(undefined);
    try {
      if (confirm.kind === "application") {
        await request(apiPaths.applications.byId(applicationId), {
          method: "DELETE",
        });
        await queryClient.invalidateQueries({ queryKey: ["applications"] });
        await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        await navigate({ to: "/applications" });
        return;
      }
      if (confirm.kind === "note")
        await request(
          apiPaths.applications.noteById(applicationId, confirm.id!),
          { method: "DELETE" },
        );
      if (confirm.kind === "contact")
        await request(
          apiPaths.applications.contactById(applicationId, confirm.id!),
          { method: "DELETE" },
        );
      await refreshDetail();
      setConfirm(undefined);
    } catch (error: unknown) {
      setActionError(errorMessage(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-7">
      <Link
        to="/applications"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-white"
      >
        <ArrowLeft className="size-4" />
        Kembali ke applications
      </Link>
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#82a7ff]">
            {application.type}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            {application.title}
          </h1>
          <p className="mt-3 text-lg text-slate-400">
            {application.organizationName}
          </p>
          <div className="mt-4">
            <StatusBadge status={application.status} />
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => void toggleArchive()}>
            <Archive className="size-4" />
            {application.archivedAt ? "Pulihkan" : "Arsipkan"}
          </Button>
          <Link
            to="/applications/$applicationId/edit"
            params={{ applicationId }}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-semibold text-slate-200 hover:bg-white/5"
          >
            <FilePenLine className="size-4" />
            Edit
          </Link>
          <Button
            variant="danger"
            onClick={() => setConfirm({ kind: "application" })}
          >
            <Trash2 className="size-4" />
            Hapus
          </Button>
        </div>
      </div>
      {actionError ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-300/20 bg-rose-400/8 px-4 py-3 text-sm text-rose-100"
        >
          {actionError}
        </div>
      ) : null}
      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <Panel className="p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#82a7ff]">
              Status
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-white">
                  {statusLabel(application.status)}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Mengubah status langsung membuat activity baru.
                </p>
              </div>
              <select
                className="input max-w-45"
                value={application.status}
                onChange={(event) =>
                  void patchStatus(event.target.value as ApplicationStatus)
                }
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {statusLabel(status)}
                  </option>
                ))}
              </select>
            </div>
          </Panel>
          <Panel className="p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#82a7ff]">
              Details
            </p>
            <dl className="mt-5 grid gap-x-7 gap-y-5 sm:grid-cols-2">
              <Detail
                label="Deadline"
                value={formatDate(application.deadlineAt, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              />
              <Detail
                label="Langkah berikutnya"
                value={formatDate(application.nextStepAt, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              />
              <Detail
                label="Lokasi"
                value={application.location ?? "Belum ditentukan"}
              />
              <Detail
                label="Mode kerja"
                value={application.workMode ?? "Belum ditentukan"}
              />
              <Detail
                label="Kompensasi"
                value={formatCompensation(application)}
              />
              <Detail
                label="Tanggal apply"
                value={formatDate(application.appliedAt)}
              />
            </dl>
            {application.sourceUrl ? (
              <a
                href={application.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#9dbaff] hover:text-white"
              >
                <ExternalLink className="size-4" />
                Buka sumber
              </a>
            ) : null}
            {application.description ? (
              <p className="mt-6 whitespace-pre-wrap border-t border-white/7 pt-5 leading-7 text-slate-300">
                {application.description}
              </p>
            ) : null}
          </Panel>
          <NotesPanel
            application={application}
            noteForm={noteForm}
            onAdd={addNote}
            onDelete={(id) => setConfirm({ kind: "note", id })}
          />
          <ContactsPanel
            application={application}
            contactForm={contactForm}
            onAdd={addContact}
            onDelete={(id) => setConfirm({ kind: "contact", id })}
          />
        </div>
        <Panel className="h-fit p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#82a7ff]">
            Activity
          </p>
          <h2 className="mt-2 text-lg font-semibold text-white">
            Timeline application
          </h2>
          <ol className="mt-6 space-y-5 border-l border-white/10 pl-5">
            {application.activities.length ? (
              application.activities.map((activity) => (
                <li key={activity.id} className="relative">
                  <span className="absolute -left-[1.58rem] top-1.5 size-2 rounded-full bg-[#82a7ff] ring-4 ring-[#11151d]" />
                  <p className="font-medium text-slate-200">
                    {activityLabel(activity.type)}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {formatDate(activity.createdAt, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </li>
              ))
            ) : (
              <li className="text-sm text-slate-500">
                Activity akan muncul saat application dibuat atau diperbarui.
              </li>
            )}
          </ol>
        </Panel>
      </div>
      <ConfirmDialog
        open={Boolean(confirm)}
        onOpenChange={(open) => {
          if (!open) setConfirm(undefined);
        }}
        title={
          confirm?.kind === "application"
            ? "Hapus application ini?"
            : confirm?.kind === "note"
              ? "Hapus catatan ini?"
              : "Hapus kontak ini?"
        }
        description={
          confirm?.kind === "application"
            ? "Application akan disembunyikan dari tracker aktif. Tindakan ini tidak bisa dibatalkan dari UI MVP."
            : "Tindakan ini akan menghapus item dari application ini."
        }
        confirmLabel="Hapus"
        pending={pending}
        onConfirm={() => void runConfirmation()}
      />
    </div>
  );
}

function NotesPanel({
  application,
  noteForm,
  onAdd,
  onDelete,
}: {
  application: ApplicationDetailDto;
  noteForm: ReturnType<typeof useForm<{ body: string }>>;
  onAdd(input: { body: string }): Promise<void>;
  onDelete(id: string): void;
}) {
  return (
    <Panel className="p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <FilePenLine className="size-5 text-[#82a7ff]" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#82a7ff]">
            Notes
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">
            Catatan pribadi
          </h2>
        </div>
      </div>
      <form className="mt-5" onSubmit={noteForm.handleSubmit(onAdd)}>
        <textarea
          className="input min-h-24 resize-y"
          placeholder="Tambahkan konteks interview, bahan persiapan, atau follow-up…"
          {...noteForm.register("body", {
            required: "Catatan tidak boleh kosong",
          })}
        />
        <FieldError message={noteForm.formState.errors.body?.message} />
        <Button className="mt-3" type="submit">
          Tambah catatan
        </Button>
      </form>
      <div className="mt-6 space-y-3">
        {application.notes.length ? (
          application.notes.map((note) => (
            <article
              key={note.id}
              className="rounded-xl border border-white/8 bg-white/[0.025] p-4"
            >
              <div className="flex justify-between gap-3">
                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-300">
                  {note.body}
                </p>
                <button
                  aria-label="Hapus catatan"
                  type="button"
                  className="text-slate-500 hover:text-rose-300"
                  onClick={() => onDelete(note.id)}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                {formatDate(note.createdAt, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </article>
          ))
        ) : (
          <p className="text-sm text-slate-500">Belum ada catatan.</p>
        )}
      </div>
    </Panel>
  );
}

function ContactsPanel({
  application,
  contactForm,
  onAdd,
  onDelete,
}: {
  application: ApplicationDetailDto;
  contactForm: ReturnType<typeof useForm<ApplicationContactCreateInput>>;
  onAdd(input: ApplicationContactCreateInput): Promise<void>;
  onDelete(id: string): void;
}) {
  return (
    <Panel className="p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <UserRoundPlus className="size-5 text-[#82a7ff]" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#82a7ff]">
            Contacts
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">
            Orang yang relevan
          </h2>
        </div>
      </div>
      <form
        className="mt-5 grid gap-3 sm:grid-cols-2"
        onSubmit={contactForm.handleSubmit(onAdd)}
      >
        <input
          className="input"
          placeholder="Nama"
          {...contactForm.register("name", { required: "Nama wajib diisi" })}
        />
        <input
          className="input"
          placeholder="Peran (opsional)"
          {...contactForm.register("role")}
        />
        <input
          className="input"
          type="email"
          placeholder="Email (opsional)"
          {...contactForm.register("email")}
        />
        <input
          className="input"
          type="url"
          placeholder="LinkedIn / URL (opsional)"
          {...contactForm.register("profileUrl")}
        />
        <FieldError message={contactForm.formState.errors.name?.message} />
        <Button type="submit">Tambah kontak</Button>
      </form>
      <div className="mt-6 space-y-3">
        {application.contacts.length ? (
          application.contacts.map((contact) => (
            <article
              key={contact.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.025] p-4"
            >
              <div>
                <p className="font-semibold text-slate-200">{contact.name}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {[contact.role, contact.email].filter(Boolean).join(" · ") ||
                    "Kontak application"}
                </p>
                {contact.profileUrl ? (
                  <a
                    className="mt-2 inline-flex text-sm font-semibold text-[#9dbaff] hover:text-white"
                    href={contact.profileUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Buka profil
                  </a>
                ) : null}
              </div>
              <button
                aria-label={`Hapus ${contact.name}`}
                type="button"
                className="text-slate-500 hover:text-rose-300"
                onClick={() => onDelete(contact.id)}
              >
                <Trash2 className="size-4" />
              </button>
            </article>
          ))
        ) : (
          <p className="text-sm text-slate-500">Belum ada kontak.</p>
        )}
      </div>
    </Panel>
  );
}

function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode | undefined;
}) {
  return (
    <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#82a7ff]">
          {eyebrow}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
          {description}
        </p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
function Metric({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: number;
  detail: string;
  icon: ReactNode;
}) {
  return (
    <Panel className="p-5">
      <div className="flex items-start justify-between">
        <p className="text-sm text-slate-400">{label}</p>
        <span className="text-[#82a7ff]">{icon}</span>
      </div>
      <p className="mt-6 text-3xl font-semibold tracking-tight text-white">
        {value}
      </p>
      <p className="mt-2 text-xs text-slate-500">{detail}</p>
    </Panel>
  );
}
function UpcomingRow({ application }: { application: ApplicationDto }) {
  return (
    <Link
      to="/applications/$applicationId"
      params={{ applicationId: application.id }}
      className="flex items-center justify-between gap-4 py-4 first:pt-1 hover:text-white"
    >
      <div>
        <p className="font-medium text-slate-200">{application.title}</p>
        <p className="mt-1 text-sm text-slate-500">
          {application.organizationName}
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-amber-200">
          {formatDate(application.deadlineAt, {
            day: "numeric",
            month: "short",
          })}
        </p>
        <p className="mt-1 text-xs text-slate-500">Deadline</p>
      </div>
    </Link>
  );
}
function RecentCard({ application }: { application: ApplicationDto }) {
  return (
    <Link
      to="/applications/$applicationId"
      params={{ applicationId: application.id }}
      className="flex items-center justify-between gap-4 rounded-xl border border-white/8 bg-white/[0.02] p-4 transition hover:border-white/16 hover:bg-white/[0.04]"
    >
      <div className="min-w-0">
        <p className="truncate font-semibold text-slate-100">
          {application.title}
        </p>
        <p className="mt-1 truncate text-sm text-slate-500">
          {application.organizationName}
        </p>
      </div>
      <StatusBadge status={application.status} />
    </Link>
  );
}
function Pagination({
  meta,
  onPage,
}: {
  meta: ApplicationListResponse["meta"];
  onPage(page: number): void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-sm text-slate-500">
        Halaman {meta.page} · {meta.total} application
      </p>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          aria-label="Halaman sebelumnya"
          disabled={meta.page <= 1}
          onClick={() => onPage(meta.page - 1)}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          variant="secondary"
          aria-label="Halaman berikutnya"
          disabled={!meta.hasNextPage}
          onClick={() => onPage(meta.page + 1)}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
        {label}
      </dt>
      <dd className="mt-2 text-sm text-slate-200">{value}</dd>
    </div>
  );
}
function AuthField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | undefined;
  children: ReactNode;
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-slate-200">
        {label}
      </span>
      {children}
      <FieldError message={error} />
    </label>
  );
}
function FullPageLoading({ label }: { label: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#090b10] p-5">
      <LoadingState label={label} />
    </main>
  );
}
function formatCompensation(application: ApplicationDto): string {
  const minimum = formatCurrency(application.salaryMin, application.currency);
  const maximum = formatCurrency(application.salaryMax, application.currency);
  return minimum && maximum
    ? `${minimum} – ${maximum}`
    : (minimum ?? maximum ?? "Belum ditentukan");
}
