import {
  createRootRoute,
  createRoute,
  createRouter,
  Navigate,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";

import { useAuth } from "./auth/auth-provider";
import { AppShell } from "./components/app-shell";
import { LoadingState } from "./components/ui";
import {
  ApplicationCreatePage,
  ApplicationDetailPage,
  ApplicationEditPage,
  ApplicationsPage,
  DashboardPage,
  LoginPage,
  RegisterPage,
} from "./pages";

const rootRoute = createRootRoute({
  component: Outlet,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/register",
  component: RegisterPage,
});

const authenticatedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "authenticated",
  component: AuthenticatedLayout,
});

const dashboardRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/",
  component: DashboardPage,
});

const applicationsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/applications",
  component: ApplicationsPage,
});

const applicationCreateRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/applications/new",
  component: ApplicationCreatePage,
});

const applicationDetailRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/applications/$applicationId",
  component: ApplicationDetailRoute,
});

const applicationEditRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/applications/$applicationId/edit",
  component: ApplicationEditRoute,
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  registerRoute,
  authenticatedRoute.addChildren([
    dashboardRoute,
    applicationsRoute,
    applicationCreateRoute,
    applicationDetailRoute,
    applicationEditRoute,
  ]),
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function AuthenticatedLayout() {
  const { state } = useAuth();

  if (state.status === "loading") {
    return (
      <main className="grid min-h-screen place-items-center bg-[#090b10] p-5">
        <LoadingState label="Memeriksa session amanmu…" />
      </main>
    );
  }

  if (state.status === "anonymous") {
    return <Navigate to="/login" replace />;
  }

  return <AppShell user={state.session.user} />;
}

function ApplicationDetailRoute() {
  const { applicationId } = applicationDetailRoute.useParams();
  return <ApplicationDetailPage applicationId={applicationId} />;
}

function ApplicationEditRoute() {
  const { applicationId } = applicationEditRoute.useParams();
  return <ApplicationEditPage applicationId={applicationId} />;
}

export function App() {
  return <RouterProvider router={router} />;
}
