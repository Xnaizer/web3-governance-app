import { Link } from "react-router-dom";
import {
  Clock,
  Lock,
  SquarePen,
  Snowflake,
  OctagonAlert,
  Users,
  UserCheck,
  CheckSquare,
  Award,
  FilePlus,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "../../components/ui/StatCard";
import { ClockCard } from "../../components/ui/ClockCard";
import { WeatherCard } from "../../components/ui/WeatherCard";
import { useMe } from "../../hooks/useAuth";
import { useDashboardStats } from "../../hooks/useDashboardStats";
import { OnboardingChecklist } from "../../components/dashboard/home/OnboardingChecklist";
import { AdminPanel } from "../../components/dashboard/home/AdminPanel";
import { ValidatorPanel } from "../../components/dashboard/home/ValidatorPanel";
import { AuditorPanel } from "../../components/dashboard/home/AuditorPanel";
import { PicPanel } from "../../components/dashboard/home/PicPanel";
import {
  REPUTATION_BLOCKED,
  reputationTone,
} from "../../components/dashboard/home/shared";

export function DashboardHome() {
  const { data: me } = useMe();
  const stats = useDashboardStats();
  if (!me) return null;

  const rep = reputationTone(me.reputationScore);
  const hour = new Date().getHours();
  const greeting =
    hour < 11
      ? "Selamat pagi"
      : hour < 15
      ? "Selamat siang"
      : hour < 18
      ? "Selamat sore"
      : "Selamat malam";

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-sm text-muted-foreground">
          {greeting} 👋 Selamat datang kembali di{" "}
          <span className="font-medium text-foreground">GovernanceFund</span>.
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Halo, {me.name ?? me.username}
          </h1>
          <Badge className="rounded-sm">{me.role}</Badge>
        </div>
      </div>

      {!me.walletAddress && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950">
          <CardContent className="p-4 text-sm">
            ⚠️ Wallet belum di-bind — aksi on-chain butuh wallet. Buka{" "}
            <Link to="/profile" className="font-semibold underline">
              Profil
            </Link>{" "}
            untuk bind.
          </CardContent>
        </Card>
      )}
      {!me.isVerified && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950">
          <CardContent className="p-4 text-sm">
            ⚠️ Identitas belum diverifikasi admin — sebagian aksi (mis. buat
            program) masih terkunci.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <ClockCard />
        <div className="flex flex-col gap-4">
          <WeatherCard />
          <div className="grid flex-1 grid-cols-2 content-start gap-3 sm:grid-cols-4">
            <StatCard
              label="Reputasi"
              value={me.reputationScore}
              icon={<Award />}
              tone={rep.tone}
              hint={`Tier: ${rep.label}`}
            />

            {me.role === "PIC" && (
              <>
                <StatCard
                  label="Program Aktif"
                  value={stats.my.active}
                  icon={<Clock />}
                  tone="primary"
                  to="/dashboard/programs"
                />
                <StatCard
                  label="Draft (belum submit)"
                  value={stats.my.drafts}
                  icon={<FilePlus />}
                  tone="warning"
                  to="/dashboard/programs"
                />
                <StatCard
                  label="Selesai"
                  value={stats.my.finished}
                  icon={<CheckSquare />}
                  tone="success"
                  to="/dashboard/programs"
                />
              </>
            )}

            {me.role === "VALIDATOR" && (
              <>
                <StatCard
                  label="Proposal menunggu"
                  value={stats.counts.PENDING}
                  icon={<Clock />}
                  tone="primary"
                  to="/dashboard/proposals"
                />
                <StatCard
                  label="Banding menunggu"
                  value={stats.counts.FROZEN}
                  icon={<Lock />}
                  tone="warning"
                  to="/dashboard/appeals"
                />
                <StatCard
                  label="Milestone to-sign"
                  value={stats.toSign}
                  icon={<SquarePen />}
                  tone="secondary"
                  to="/dashboard/sign"
                />
              </>
            )}

            {me.role === "AUDITOR" && (
              <>
                <StatCard
                  label="Bisa dibekukan"
                  value={stats.counts.DRAWABLE}
                  icon={<Snowflake />}
                  tone="primary"
                  to="/dashboard/audit"
                />
                <StatCard
                  label="Frozen"
                  value={stats.counts.FROZEN}
                  icon={<Lock />}
                  tone="warning"
                />
                <StatCard
                  label="Fraud"
                  value={stats.counts.FRAUD_CONFIRMED}
                  icon={<OctagonAlert />}
                  tone="danger"
                />
              </>
            )}

            {me.role === "ADMIN" && (
              <>
                <StatCard
                  label="Total Pengguna"
                  value={stats.totalUsers}
                  icon={<Users />}
                  tone="primary"
                  to="/dashboard/governance"
                />
                <StatCard
                  label="Belum verifikasi"
                  value={stats.unverifiedUsers}
                  icon={<UserCheck />}
                  tone="warning"
                  to="/dashboard/governance"
                />
                <StatCard
                  label="Voting berjalan"
                  value={stats.openRoleVotes}
                  icon={<Clock />}
                  tone="secondary"
                  to="/dashboard/governance"
                />
              </>
            )}
          </div>
        </div>
      </div>

      {me.role === "PIC" && me.reputationScore < REPUTATION_BLOCKED && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="p-4 text-sm text-destructive">
            🚫 Reputasi Anda di bawah {REPUTATION_BLOCKED} — pembuatan program
            baru diblokir hingga reputasi pulih.
          </CardContent>
        </Card>
      )}

      {me.role === "USER" && <OnboardingChecklist me={me} />}
      {me.role === "ADMIN" && <AdminPanel />}
      {me.role === "VALIDATOR" && <ValidatorPanel />}
      {me.role === "AUDITOR" && <AuditorPanel />}

      {me.role === "PIC" && <PicPanel me={me} />}
    </div>
  );
}
