import { lazy, Suspense, useEffect, type ReactElement } from "react";
import { Routes, Route } from "react-router-dom";
import { beginRouteLoad } from "../lib/routeProgress";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { PublicOnlyRoute } from "../components/PublicOnlyRoute";
import { RoleRoute } from "../components/RoleRoute";
import { DashboardShell } from "../components/layout/DashboardShell";
import type { Role } from "../types/auth";

const Landing = lazy(() =>
  import("../pages/Landing").then((m) => ({ default: m.Landing })),
);
const ExplorerPage = lazy(() =>
  import("../pages/ExplorerPage").then((m) => ({ default: m.ExplorerPage })),
);
const AboutPage = lazy(() =>
  import("../pages/AboutPage").then((m) => ({ default: m.AboutPage })),
);
const ProgramDetailPage = lazy(() =>
  import("../pages/ProgramDetailPage").then((m) => ({
    default: m.ProgramDetailPage,
  })),
);
const RegisterPage = lazy(() =>
  import("../pages/RegisterPage").then((m) => ({ default: m.RegisterPage })),
);
const LoginPage = lazy(() =>
  import("../pages/LoginPage").then((m) => ({ default: m.LoginPage })),
);
const VerifyEmailPage = lazy(() =>
  import("../pages/VerifyEmailPage").then((m) => ({
    default: m.VerifyEmailPage,
  })),
);
const ResendVerificationPage = lazy(() =>
  import("../pages/ResendVerificationPage").then((m) => ({
    default: m.ResendVerificationPage,
  })),
);
const ForgotPasswordPage = lazy(() =>
  import("../pages/ForgotPasswordPage").then((m) => ({
    default: m.ForgotPasswordPage,
  })),
);
const ResetPasswordPage = lazy(() =>
  import("../pages/ResetPasswordPage").then((m) => ({
    default: m.ResetPasswordPage,
  })),
);
const NotFoundPage = lazy(() =>
  import("../pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage })),
);

const UsersPage = lazy(() =>
  import("../pages/public/UsersPage").then((m) => ({ default: m.UsersPage })),
);
const UserDetailPage = lazy(() =>
  import("../pages/public/UserDetailPage").then((m) => ({
    default: m.UserDetailPage,
  })),
);
const RoleLogsPage = lazy(() =>
  import("../pages/public/RoleLogsPage").then((m) => ({
    default: m.RoleLogsPage,
  })),
);
const VotesPage = lazy(() =>
  import("../pages/public/VotesPage").then((m) => ({ default: m.VotesPage })),
);
const VoteDetailPage = lazy(() =>
  import("../pages/public/VoteDetailPage").then((m) => ({
    default: m.VoteDetailPage,
  })),
);
const ProgramVotesPage = lazy(() =>
  import("../pages/public/ProgramVotesPage").then((m) => ({
    default: m.ProgramVotesPage,
  })),
);
const RedemptionsPage = lazy(() =>
  import("../pages/public/RedemptionsPage").then((m) => ({
    default: m.RedemptionsPage,
  })),
);

const ProfilePage = lazy(() =>
  import("../pages/ProfilePage").then((m) => ({ default: m.ProfilePage })),
);
const DashboardHome = lazy(() =>
  import("../pages/dashboard/DashboardHome").then((m) => ({
    default: m.DashboardHome,
  })),
);
const CreateProgramPage = lazy(() =>
  import("../pages/dashboard/CreateProgramPage").then((m) => ({
    default: m.CreateProgramPage,
  })),
);
const MyProgramsPage = lazy(() =>
  import("../pages/dashboard/MyProgramsPage").then((m) => ({
    default: m.MyProgramsPage,
  })),
);
const ProgramManagePage = lazy(() =>
  import("../pages/dashboard/ProgramManagePage").then((m) => ({
    default: m.ProgramManagePage,
  })),
);
const RedeemPage = lazy(() =>
  import("../pages/dashboard/RedeemPage").then((m) => ({
    default: m.RedeemPage,
  })),
);
const ProposalsPage = lazy(() =>
  import("../pages/dashboard/ProposalsPage").then((m) => ({
    default: m.ProposalsPage,
  })),
);
const AppealsPage = lazy(() =>
  import("../pages/dashboard/AppealsPage").then((m) => ({
    default: m.AppealsPage,
  })),
);
const AuditPage = lazy(() =>
  import("../pages/dashboard/AuditPage").then((m) => ({
    default: m.AuditPage,
  })),
);
const GovernancePage = lazy(() =>
  import("../pages/dashboard/GovernancePage").then((m) => ({
    default: m.GovernancePage,
  })),
);
const SigningPage = lazy(() =>
  import("../pages/dashboard/SigningPage").then((m) => ({
    default: m.SigningPage,
  })),
);
const GatewayOperatorPage = lazy(() =>
  import("../pages/dashboard/GatewayOperatorPage").then((m) => ({
    default: m.GatewayOperatorPage,
  })),
);

const role = (roles: Role[], el: ReactElement) => (
  <RoleRoute roles={roles}>{el}</RoleRoute>
);

const SIGNERS: Role[] = ["ADMIN", "VALIDATOR", "AUDITOR"];

function RouteFallback() {
  useEffect(() => beginRouteLoad(), []);
  return null;
}

export function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* ── Public ── */}
        <Route path="/" element={<Landing />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/programs" element={<ExplorerPage />} />
        <Route path="/programs/:id" element={<ProgramDetailPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/users/:id" element={<UserDetailPage />} />
        <Route path="/governance/roles" element={<RoleLogsPage />} />
        <Route path="/governance/votes" element={<VotesPage />} />
        <Route path="/governance/votes/:id" element={<VoteDetailPage />} />
        <Route
          path="/governance/program-votes"
          element={<ProgramVotesPage />}
        />
        <Route path="/gateway/redemptions" element={<RedemptionsPage />} />
        <Route
          path="/register"
          element={
            <PublicOnlyRoute>
              <RegisterPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <LoginPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicOnlyRoute>
              <ForgotPasswordPage />
            </PublicOnlyRoute>
          }
        />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route
          path="/resend-verification"
          element={<ResendVerificationPage />}
        />

        <Route
          element={
            <ProtectedRoute>
              <DashboardShell />
            </ProtectedRoute>
          }
        >
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/dashboard" element={<DashboardHome />} />

          <Route
            path="/dashboard/programs"
            element={role(["PIC"], <MyProgramsPage />)}
          />
          <Route
            path="/dashboard/create-program"
            element={role(["PIC"], <CreateProgramPage />)}
          />
          <Route
            path="/dashboard/programs/:id/manage"
            element={role(["PIC"], <ProgramManagePage />)}
          />
          <Route
            path="/dashboard/redeem"
            element={role(["PIC"], <RedeemPage />)}
          />

          <Route
            path="/dashboard/proposals"
            element={role(["VALIDATOR"], <ProposalsPage />)}
          />
          <Route
            path="/dashboard/appeals"
            element={role(["VALIDATOR"], <AppealsPage />)}
          />

          <Route
            path="/dashboard/audit"
            element={role(["AUDITOR"], <AuditPage />)}
          />

          <Route
            path="/dashboard/governance"
            element={role(["ADMIN"], <GovernancePage />)}
          />

          <Route
            path="/dashboard/sign"
            element={role(SIGNERS, <SigningPage />)}
          />

          <Route path="/dashboard/gateway" element={<GatewayOperatorPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
