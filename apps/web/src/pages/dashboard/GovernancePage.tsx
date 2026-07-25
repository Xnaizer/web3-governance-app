import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { UserCheck, Briefcase, BarChart3, Info, Gavel, Users } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { QueryState } from "../../components/ui/QueryState";
import { BrandLoader } from "../../components/ui/BrandLoader";
import { EmptyState } from "../../components/ui/EmptyState";
import { ConfirmButton } from "../../components/ui/ConfirmButton";
import { SearchInput } from "../../components/ui/SearchInput";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { AdminUserDetailModal } from "../../components/AdminUserDetailModal";
import { UserCell } from "../../components/UserCell";
import { RowAvatar } from "../../components/dashboard/governance/RowAvatar";
import {
  PicGrantRow,
  PicActiveRow,
} from "../../components/dashboard/governance/PicRows";
import { RoleVoteCount } from "../../components/dashboard/governance/RoleVoteCount";
import { CandidateCombobox } from "../../components/dashboard/governance/CandidateCombobox";
import { MyRoleVotes } from "../../components/dashboard/governance/MyRoleVotes";
import { listUsersAdmin, type AdminUser } from "../../services/usersApi";
import { fetchRoleVotes } from "../../services/votesApi";
import { useProposeRole, useVoteRoleProposal } from "../../hooks/useAdmin";
import { useAdminThreshold } from "../../hooks/useGovReads";
import { VOTABLE_ROLES, type GovRole } from "../../config/roles";
import { formatShortenAddress } from "../../utils/format";
import { VoteDeadline } from "@/components/VoteDeadline";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  VALIDATOR: "Validator",
  AUDITOR: "Auditor",
  PIC: "PIC",
};
function roleLabel(role: string): string {
  return ROLE_LABEL[role] ?? role;
}

export function GovernancePage() {
  const users = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => listUsersAdmin({ limit: 100 }),
  });
  const votes = useQuery({
    queryKey: ["role-votes", "gov"],
    queryFn: () => fetchRoleVotes({ limit: 50 }),
  });
  const { total: adminTotal, threshold: adminThreshold } = useAdminThreshold();

  const [candidate, setCandidate] = useState("");
  const [role, setRole] = useState<GovRole>("VALIDATOR_ROLE");
  const [picSearch, setPicSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const propose = useProposeRole();
  const roleVote = useVoteRoleProposal();

  const validAddr = /^0x[a-fA-F0-9]{40}$/.test(candidate);
  const open = votes.data?.rows.filter((v) => !v.executed && !v.isExpired) ?? [];
  const expired = votes.data?.rows.filter((v) => !v.executed && v.isExpired) ?? [];

  const allUsers = users.data?.users ?? [];
  const matchUser = (u: AdminUser) => {
    const s = picSearch.trim().toLowerCase();
    if (!s) return true;
    return (
      (u.name ?? "").toLowerCase().includes(s) ||
      u.username.toLowerCase().includes(s) ||
      (u.walletAddress ?? "").toLowerCase().includes(s)
    );
  };
  const usersToGrant = allUsers.filter(
    (u) => u.role === "USER" && matchUser(u),
  );
  const activePics = allUsers.filter((u) => u.role === "PIC" && matchUser(u));
  const candidatesWithWallet = allUsers.filter((u) => u.walletAddress);

  const unverifiedCount = allUsers.filter((u) => !u.isVerified).length;
  const roleCount = (r: string) => allUsers.filter((u) => u.role === r).length;
  const adminCount = roleCount("ADMIN");
  const validatorCount = roleCount("VALIDATOR");
  const auditorCount = roleCount("AUDITOR");

  const allUsersFiltered = allUsers.filter((u) => {
    const s = userSearch.trim().toLowerCase();
    if (!s) return true;
    return (
      (u.name ?? "").toLowerCase().includes(s) ||
      u.username.toLowerCase().includes(s) ||
      (u.walletAddress ?? "").toLowerCase().includes(s)
    );
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Admin · Governance"
        title="Tata Kelola Peran"
        gradient
        subtitle="Kelola PIC (grant langsung) dan perubahan peran struktural via voting BFT admin."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Tabs defaultValue="pic" className="min-w-0">
          <TabsList className="rounded-lg bg-muted p-1">
            <TabsTrigger value="pic">Kelola PIC</TabsTrigger>
            <TabsTrigger value="vote">Tata Kelola (Voting BFT)</TabsTrigger>
            <TabsTrigger value="mine">Voting Saya</TabsTrigger>
          </TabsList>

          <TabsContent value="pic">
            <div className="flex flex-col gap-6 pt-2">
              <SearchInput
                value={picSearch}
                onChange={setPicSearch}
                placeholder="Cari nama / wallet…"
                className="max-w-xs"
              />
              <Card className="rounded-2xl border-black/5 shadow-none">
                <CardHeader className="flex-row items-center gap-2 space-y-0 font-display font-semibold tracking-tight">
                  <UserCheck className="h-4 w-4 text-brand-blue" />
                  Verifikasi &amp; Grant PIC — khusus role USER
                </CardHeader>
                <CardContent>
                  <QueryState
                    skeleton={<BrandLoader />}
                    isLoading={users.isLoading}
                    isError={users.isError}
                    error={users.error}
                    isEmpty={usersToGrant.length === 0}
                    onRetry={users.refetch}
                    emptyIcon={<UserCheck />}
                    emptyTitle="Tidak ada kandidat"
                    emptyDescription="Hanya user berperan USER yang bisa diverifikasi & di-grant PIC."
                  >
                    {usersToGrant.map((u) => (
                      <PicGrantRow
                        key={u.id}
                        u={u}
                        onDetail={setDetailUserId}
                      />
                    ))}
                  </QueryState>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-black/5 shadow-none">
                <CardHeader className="flex-row items-center gap-2 space-y-0 font-display font-semibold tracking-tight">
                  <Briefcase className="h-4 w-4 text-[#818CF8]" />
                  PIC Aktif
                </CardHeader>
                <CardContent>
                  {activePics.length === 0 ? (
                    <EmptyState
                      icon={<Briefcase />}
                      title="Belum ada PIC aktif"
                      description="PIC yang di-grant akan muncul di sini."
                    />
                  ) : (
                    activePics.map((u) => (
                      <PicActiveRow
                        key={u.id}
                        u={u}
                        onDetail={setDetailUserId}
                      />
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="vote">
            <div className="flex flex-col gap-6 pt-2">
              <Card className="rounded-2xl border-black/5 shadow-none">
                <CardHeader className="font-display font-semibold tracking-tight">
                  Usulkan Perubahan Peran (BFT admin)
                </CardHeader>
                <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex flex-1 flex-col gap-1.5">
                    <Label>Kandidat / Target</Label>
                    <CandidateCombobox
                      candidates={candidatesWithWallet}
                      value={candidate}
                      onChange={setCandidate}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 sm:w-44">
                    <Label>Peran</Label>
                    <Select
                      value={role}
                      onValueChange={(v) => setRole(v as GovRole)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {VOTABLE_ROLES.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <ConfirmButton
                    triggerLabel="Usul Grant"
                    triggerProps={{ color: "primary", isDisabled: !validAddr }}
                    title="Usulkan grant peran?"
                    confirmLabel="Ya, buat usulan"
                    toasts={{
                      loading: "Mengirim usulan…",
                      success: "Usulan dibuat.",
                    }}
                    action={() => propose.propose(candidate, role, false)}
                    warnings={[
                      "Usulan tercatat on-chain dan tidak bisa dibatalkan.",
                      "Kandidat harus belum memegang peran apa pun (kontrak menolak bila sudah).",
                      "Perlu ambang BFT admin (⌊2N/3⌋+1) agar perubahan berlaku.",
                    ]}
                  />
                  <ConfirmButton
                    triggerLabel="Usul Devote"
                    triggerProps={{
                      color: "danger",
                      variant: "flat",
                      isDisabled: !validAddr,
                    }}
                    title="Usulkan pencabutan peran?"
                    confirmLabel="Ya, buat usulan devote"
                    confirmColor="danger"
                    toasts={{
                      loading: "Mengirim usulan…",
                      success: "Usulan dibuat.",
                    }}
                    action={() => propose.propose(candidate, role, true)}
                    warnings={[
                      "Usulan tercatat on-chain dan tidak bisa dibatalkan.",
                      "Target harus sedang memegang peran yang dicabut.",
                      "Perlu ambang BFT admin (⌊2N/3⌋+1) agar pencabutan berlaku.",
                    ]}
                  />
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-black/5 shadow-none">
                <CardHeader className="flex-row items-center justify-between space-y-0 font-display font-semibold tracking-tight">
                  <span>Voting Peran Berjalan</span>
                  <Badge variant="secondary" className="rounded-sm">
                    {adminTotal} admin · ambang {adminThreshold}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <QueryState
                    skeleton={<BrandLoader />}
                    isLoading={votes.isLoading}
                    isError={votes.isError}
                    error={votes.error}
                    isEmpty={open.length === 0}
                    onRetry={votes.refetch}
                    emptyIcon={<Gavel />}
                    emptyTitle="Tidak ada voting berjalan"
                    emptyDescription="Usulan perubahan peran yang sedang divote akan tampil di sini."
                  >
                    <div className="flex flex-col gap-3">
                      {open.map((v) => (
                        <div
                          key={v.voteId}
                          className="flex flex-wrap items-center gap-3 rounded-xl border border-black/5 p-3 text-sm"
                        >
                          <Link
                            to={`/governance/votes/${v.voteId}`}
                            className="min-w-0 flex-1"
                          >
                            <UserCell
                              user={v.candidateUser}
                              wallet={v.candidate}
                              size="md"
                            />
                          </Link>
                          <div className="flex flex-col items-start gap-1 sm:items-end">
                            <span className="font-mono text-xs text-muted-foreground">
                              #{v.voteId}
                            </span>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Badge
                                variant={v.isDevote ? "destructive" : "default"}
                                className="rounded-sm"
                              >
                                {v.isDevote ? "Devote" : "Grant"}
                              </Badge>
                              <Badge variant="secondary" className="rounded-sm">
                                Diajukan sebagai {roleLabel(v.roleToTarget)}
                              </Badge>
                            </div>
                          </div>
                          <VoteDeadline start={v.submittedAt} compact />
                          <RoleVoteCount
                            voteId={v.voteId}
                            threshold={adminThreshold}
                          />
                          <ConfirmButton
                            triggerLabel="Setujui"
                            triggerProps={{ size: "sm", color: "primary", isDisabled: v.isExpired }}
                            title={`Setujui usulan peran #${v.voteId}?`}
                            confirmLabel="Ya, kirim vote"
                            toasts={{
                              loading: "Vote…",
                              success: "Vote terkirim.",
                            }}
                            action={() => roleVote.vote(v.voteId)}
                            warnings={[
                              "Vote tercatat on-chain dan tidak bisa dibatalkan.",
                              "Perubahan peran berlaku begitu ambang BFT admin tercapai.",
                            ]}
                          />
                        </div>
                      ))}
                    </div>
                  </QueryState>
                </CardContent>
              </Card>

              {expired.length > 0 && (
                <Card className="rounded-2xl border-amber-400/50 shadow-none">
                  <CardHeader className="flex-row items-center justify-between space-y-0 font-display font-semibold tracking-tight">
                    <span>Voting Peran Kedaluwarsa</span>
                    <Badge variant="secondary" className="rounded-sm">
                      {expired.length} usulan
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-3 text-sm text-muted-foreground">
                      Usulan ini sudah melewati batas waktu voting (7 hari) dan
                      tidak bisa disetujui lagi on-chain. Butuh usulan baru
                      kalau perubahan peran ini masih diperlukan.
                    </p>
                    <div className="flex flex-col gap-3">
                      {expired.map((v) => (
                        <div
                          key={v.voteId}
                          className="flex flex-wrap items-center gap-3 rounded-xl border border-black/5 p-3 text-sm"
                        >
                          <Link
                            to={`/governance/votes/${v.voteId}`}
                            className="min-w-0 flex-1"
                          >
                            <UserCell
                              user={v.candidateUser}
                              wallet={v.candidate}
                              size="md"
                            />
                          </Link>
                          <div className="flex flex-col items-start gap-1 sm:items-end">
                            <span className="font-mono text-xs text-muted-foreground">
                              #{v.voteId}
                            </span>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Badge
                                variant={v.isDevote ? "destructive" : "default"}
                                className="rounded-sm"
                              >
                                {v.isDevote ? "Devote" : "Grant"}
                              </Badge>
                              <Badge variant="secondary" className="rounded-sm">
                                Diajukan sebagai {roleLabel(v.roleToTarget)}
                              </Badge>
                            </div>
                          </div>
                          <RoleVoteCount
                            voteId={v.voteId}
                            threshold={adminThreshold}
                          />
                          <VoteDeadline start={v.submittedAt} compact />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="rounded-2xl border-black/5 shadow-none">
                <CardHeader className="flex-row items-center gap-2 space-y-0 font-display font-semibold tracking-tight">
                  <Users className="h-4 w-4 text-brand-blue" />
                  Semua Pengguna
                  <Badge variant="secondary" className="ml-auto rounded-sm">
                    {allUsers.length}
                  </Badge>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <SearchInput
                    value={userSearch}
                    onChange={setUserSearch}
                    placeholder="Cari nama / wallet untuk cek detail…"
                    className="max-w-xs"
                  />
                  <QueryState
                    skeleton={<BrandLoader />}
                    isLoading={users.isLoading}
                    isError={users.isError}
                    error={users.error}
                    isEmpty={allUsersFiltered.length === 0}
                    onRetry={users.refetch}
                    emptyIcon={<Users />}
                    emptyTitle="Tidak ada pengguna"
                  >
                    <div className="flex max-h-104 flex-col overflow-y-auto pr-1">
                      {allUsersFiltered.map((u) => (
                        <div
                          key={u.id}
                          className="flex flex-wrap items-center gap-2 border-b border-black/5 py-2.5 last:border-0"
                        >
                          <RowAvatar u={u} />
                          <div className="min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={() => setDetailUserId(u.id)}
                              className="block max-w-full truncate text-left text-sm font-semibold text-brand-blue hover:underline"
                            >
                              {u.name ?? u.username}
                            </button>
                            <span className="font-mono text-xs text-muted-foreground">
                              {u.walletAddress
                                ? formatShortenAddress(u.walletAddress)
                                : "tanpa wallet"}
                            </span>
                          </div>
                          <Badge variant="secondary" className="rounded-sm">
                            {u.role}
                          </Badge>
                          {u.isVerified ? (
                            <Badge variant="success" className="rounded-sm">
                              verified
                            </Badge>
                          ) : (
                            <Badge variant="warning" className="rounded-sm">
                              unverified
                            </Badge>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDetailUserId(u.id)}
                          >
                            Detail
                          </Button>
                        </div>
                      ))}
                    </div>
                  </QueryState>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="mine">
            <div className="pt-2">
              <MyRoleVotes />
            </div>
          </TabsContent>
        </Tabs>

        <aside className="flex flex-col gap-4">
          <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-none">
            <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-brand-blue">
              <BarChart3 className="h-4 w-4" /> Ringkasan
            </span>
            <dl className="mt-4 flex flex-col divide-y divide-black/5">
              {[
                { label: "Total pengguna", value: allUsers.length },
                { label: "Admin aktif", value: adminCount },
                { label: "Validator aktif", value: validatorCount },
                { label: "Auditor aktif", value: auditorCount },
                { label: "PIC aktif", value: activePics.length },
                { label: "Ambang BFT admin", value: adminThreshold },
                { label: "Voting berjalan", value: open.length },
                { label: "Belum verifikasi", value: unverifiedCount },
              ].map((r) => (
                <div
                  key={r.label}
                  className="flex items-center justify-between py-2.5"
                >
                  <dt className="text-sm text-muted-foreground">{r.label}</dt>
                  <dd className="font-mono text-sm font-semibold">{r.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="rounded-2xl border border-black/5 bg-muted/30 p-5">
            <p className="flex items-center gap-2 text-sm font-display font-semibold tracking-tight">
              <Info className="h-4 w-4 text-brand-blue" /> Cara kerja
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              Grant PIC langsung oleh 1 admin (khusus USER terverifikasi).
              Perubahan peran struktural (Validator/Auditor/Admin) butuh voting
              BFT ⌊2N/3⌋+1 dan tercatat on-chain.
            </p>
          </div>
        </aside>
      </div>

      <AdminUserDetailModal
        userId={detailUserId}
        open={!!detailUserId}
        onOpenChange={(v) => !v && setDetailUserId(null)}
      />
    </div>
  );
}