import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Home,
  Folder,
  PlusSquare,
  RefreshCw,
  CheckSquare,
  Unlock,
  Shield,
  Users,
  SquarePen,
  LayoutGrid,
  Activity,
  Clipboard,
  CreditCard,
  Inbox,
  Landmark,
  LogOut,
  User as UserIcon,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { useMe, useLogout } from "../../hooks/useAuth";
import { useGatewayOwner } from "../../hooks/useGatewayOwner";
import { WalletConnectPopup } from "../WalletConnectPopup";
import { WalletButton } from "../WalletButton";
import { SupportWidget } from "../SupportWidget";
import { cn } from "../../utils/cn";
import type { Role } from "../../types/auth";

interface NavItem {
  label: string;
  to: string;
  roles: Role[];
  icon: ReactNode;
  end?: boolean;
}
const ALL: Role[] = ["USER", "ADMIN", "VALIDATOR", "AUDITOR", "PIC"];

function initials(s: string): string {
  return (
    s
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

const NAV: NavItem[] = [
  {
    label: "Ringkasan",
    to: "/dashboard",
    roles: ALL,
    end: true,
    icon: <Home className="h-4.5 w-4.5" />,
  },
  {
    label: "Program Saya",
    to: "/dashboard/programs",
    roles: ["PIC"],
    icon: <Folder className="h-4.5 w-4.5" />,
  },
  {
    label: "Buat Program",
    to: "/dashboard/create-program",
    roles: ["PIC"],
    icon: <PlusSquare className="h-4.5 w-4.5" />,
  },
  {
    label: "Tukar Token",
    to: "/dashboard/redeem",
    roles: ["PIC"],
    icon: <RefreshCw className="h-4.5 w-4.5" />,
  },
  {
    label: "Voting Proposal",
    to: "/dashboard/proposals",
    roles: ["VALIDATOR"],
    icon: <CheckSquare className="h-4.5 w-4.5" />,
  },
  {
    label: "Banding Unfreeze",
    to: "/dashboard/appeals",
    roles: ["VALIDATOR"],
    icon: <Unlock className="h-4.5 w-4.5" />,
  },
  {
    label: "Freeze / Audit",
    to: "/dashboard/audit",
    roles: ["AUDITOR"],
    icon: <Shield className="h-4.5 w-4.5" />,
  },
  {
    label: "Tata Kelola Peran",
    to: "/dashboard/governance",
    roles: ["ADMIN"],
    icon: <Users className="h-4.5 w-4.5" />,
  },
  {
    label: "Tanda Tangan Milestone",
    to: "/dashboard/sign",
    roles: ["ADMIN", "VALIDATOR", "AUDITOR"],
    icon: <SquarePen className="h-4.5 w-4.5" />,
  },
];

const TRANSPARENCY: NavItem[] = [
  {
    label: "List Pengguna",
    to: "/users",
    roles: ALL,
    icon: <Users className="h-4.5 w-4.5" />,
  },
  {
    label: "List Program",
    to: "/programs",
    roles: ALL,
    icon: <LayoutGrid className="h-4.5 w-4.5" />,
  },
  {
    label: "Log Perubahan Peran",
    to: "/governance/roles",
    roles: ALL,
    icon: <Activity className="h-4.5 w-4.5" />,
  },
  {
    label: "Voting Berjalan",
    to: "/governance/votes",
    roles: ALL,
    icon: <Clipboard className="h-4.5 w-4.5" />,
  },
  {
    label: "Voting Program",
    to: "/governance/program-votes",
    roles: ALL,
    icon: <Landmark className="h-4.5 w-4.5" />,
  },
  {
    label: "Penukaran",
    to: "/gateway/redemptions",
    roles: ALL,
    icon: <CreditCard className="h-4.5 w-4.5" />,
  },
];

const OPERATOR_ITEM: NavItem = {
  label: "Gateway (Operator)",
  to: "/dashboard/gateway",
  roles: ALL,
  icon: <Inbox className="h-4.5 w-4.5" />,
};

function Wordmark() {
  return (
    <Link to="/" className="flex flex-col leading-[0.95]">
      <span className="font-display text-[13px] font-bold tracking-[0.2em]">
        GOVERNANCE
      </span>
      <span className="bg-linear-to-r from-brand-mint to-brand-blue bg-clip-text font-display text-[13px] font-bold tracking-[0.36em] text-transparent">
        FUND
      </span>
    </Link>
  );
}

function NavItemLink({
  item,
  collapsed,
}: {
  item: NavItem;
  collapsed: boolean;
}) {
  const link = (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        cn(
          "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
          collapsed && "justify-center px-0",
          isActive
            ? "bg-brand-blue/10 font-semibold text-brand-blue"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-brand-blue" />
          )}
          <span className="relative z-10 shrink-0">{item.icon}</span>
          {!collapsed && (
            <span className="relative z-10 truncate">{item.label}</span>
          )}
        </>
      )}
    </NavLink>
  );
  return collapsed ? (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  ) : (
    link
  );
}

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { data: me } = useMe();
  const { mutateAsync: logout } = useLogout();
  const { isOperator } = useGatewayOwner();
  const loc = useLocation();
  const navigate = useNavigate();
  const role: Role = me?.role ?? "USER";

  const items = [
    ...NAV.filter((n) => n.roles.includes(role)),
    ...(isOperator ? [OPERATOR_ITEM] : []),
  ];
  const transparency = TRANSPARENCY.filter((n) => n.roles.includes(role));

  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("sidebar-collapsed") === "1",
  );
  const [logoutOpen, setLogoutOpen] = useState(false);
  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", collapsed ? "1" : "0");
  }, [collapsed]);
  useEffect(() => {
    setOpen(false);
  }, [loc.pathname]);

  const doLogout = async () => {
    await logout();
    navigate("/");
  };

  const sidebarInner = (mobile = false) => {
    const isCollapsed = collapsed && !mobile;
    const logoutBtn = (
      <button
        type="button"
        onClick={() => setLogoutOpen(true)}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10",
          isCollapsed && "justify-center px-0",
        )}
      >
        <LogOut className="h-4.5 w-4.5 shrink-0" />
        {!isCollapsed && <span>Keluar</span>}
      </button>
    );

    return (
      <div className="flex h-full flex-col">
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {items.map((n) => (
            <NavItemLink key={n.to} item={n} collapsed={isCollapsed} />
          ))}

          <div
            className={cn(
              "mb-1 mt-5 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/60",
              isCollapsed && "px-0 text-center",
            )}
          >
            {isCollapsed ? "···" : "Transparansi"}
          </div>
          {transparency.map((n) => (
            <NavItemLink key={n.to} item={n} collapsed={isCollapsed} />
          ))}
        </nav>

        <div className="border-t border-black/5 p-3">
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>{logoutBtn}</TooltipTrigger>
              <TooltipContent side="right">Keluar</TooltipContent>
            </Tooltip>
          ) : (
            logoutBtn
          )}
        </div>
      </div>
    );
  };

  const label = me?.name ?? me?.username ?? "";

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-black/5 bg-background/90 px-4 backdrop-blur">
        <Button
          size="icon"
          variant="ghost"
          aria-label="Buka menu"
          className="md:hidden"
          onClick={() => setOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <Wordmark />

        <div className="ml-auto flex items-center gap-4">
          <WalletButton />
          {me && (
            <>
              <span className="hidden h-8 w-px bg-black/10 sm:block" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    aria-label="Menu profil"
                    className="flex items-center gap-2.5 rounded-lg p-1 pr-1 transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40 sm:pr-2.5"
                  >
                    <Avatar className="h-9 w-9 text-xs">
                      {me.profilePictureURL && (
                        <AvatarImage src={me.profilePictureURL} alt={label} />
                      )}
                      <AvatarFallback>{initials(label)}</AvatarFallback>
                    </Avatar>
                    <span className="hidden text-left leading-tight sm:block">
                      <span className="block max-w-32 truncate text-sm font-medium">
                        {label}
                      </span>
                      <span className="block text-xs text-brand-blue">
                        {me.role}
                      </span>
                    </span>
                    <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel className="flex flex-col">
                    <span className="truncate">{label}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {me.email}
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="cursor-pointer">
                      <UserIcon className="mr-2 h-4 w-4" /> Profil saya
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer text-destructive focus:text-destructive"
                    onSelect={(e) => {
                      e.preventDefault();
                      setLogoutOpen(true);
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" /> Keluar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </header>

      <WalletConnectPopup />

      <div className="flex">
        <aside
          className={cn(
            "sticky top-16 hidden h-[calc(100vh-4rem)] shrink-0 border-r border-black/5 bg-background transition-[width] md:flex md:flex-col",
            collapsed ? "w-16" : "w-60",
          )}
        >
          <div className="border-b border-black/5 p-2">
            <Button
              variant="ghost"
              aria-label={collapsed ? "Lebarkan sidebar" : "Perkecil sidebar"}
              onClick={() => setCollapsed((c) => !c)}
              className={cn(
                "w-full gap-2 text-muted-foreground",
                collapsed ? "justify-center px-0" : "justify-start",
              )}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4" />
                  <span className="text-xs font-medium">Perkecil</span>
                </>
              )}
            </Button>
          </div>
          {sidebarInner()}
        </aside>

        {open && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/40 md:hidden"
              onClick={() => setOpen(false)}
            />
            <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-background shadow-xl md:hidden">
              <div className="flex items-center justify-between border-b border-black/5 p-3">
                <Wordmark />
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Tutup menu"
                  onClick={() => setOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {sidebarInner(true)}
            </aside>
          </>
        )}

        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>

      <SupportWidget />

      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Keluar dari akun?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan keluar dari dashboard dan koneksi wallet diputus. Sesi
              login (JWT) diblokir — Anda perlu masuk lagi untuk mengakses
              dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={doLogout}
            >
              Ya, keluar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
