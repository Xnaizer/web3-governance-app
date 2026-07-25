import { useEffect } from "react";
import { useLocation, matchPath } from "react-router-dom";

/**
 * Judul tab (document.title) mengikuti rute aktif → "GF | <Nama>".
 * Pola diurut spesifik→umum; matchPath v6 bersifat exact, jadi rute statis dan
 * dinamis (":id") tak saling bentrok. Fallback ke "GovernanceFund".
 */
const TITLES: ReadonlyArray<readonly [string, string]> = [
  ["/", "Beranda"],
  ["/about", "Tentang"],
  ["/programs", "Programs"],
  ["/programs/:id", "Detail Program"],
  ["/users", "Pengguna"],
  ["/users/:id", "Profil Pengguna"],
  ["/governance/roles", "Log Peran"],
  ["/governance/votes", "Voting"],
  ["/governance/votes/:id", "Detail Voting"],
  ["/governance/program-votes", "Voting Program"],
  ["/gateway/redemptions", "Pencairan"],
  ["/register", "Daftar"],
  ["/login", "Masuk"],
  ["/forgot-password", "Lupa Password"],
  ["/reset-password", "Reset Password"],
  ["/verify-email", "Verifikasi Email"],
  ["/profile", "Profil"],
  ["/dashboard", "Dashboard"],
  ["/dashboard/programs", "Program Saya"],
  ["/dashboard/create-program", "Buat Program"],
  ["/dashboard/programs/:id/manage", "Kelola Program"],
  ["/dashboard/redeem", "Pencairan"],
  ["/dashboard/proposals", "Proposal"],
  ["/dashboard/appeals", "Banding"],
  ["/dashboard/audit", "Audit"],
  ["/dashboard/governance", "Tata Kelola"],
  ["/dashboard/sign", "Tanda Tangan"],
  ["/dashboard/gateway", "Gateway"],
];

export function RouteTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    const found = TITLES.find(([pattern]) => matchPath(pattern, pathname));
    document.title = found ? `GF | ${found[1]}` : "GovernanceFund";
  }, [pathname]);
  return null;
}
