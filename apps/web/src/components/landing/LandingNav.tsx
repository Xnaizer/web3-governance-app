import { useState } from "react";
import { Link } from "react-router-dom";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
} from "framer-motion";
import { Menu, X } from "lucide-react";
import { cn } from "@/utils/cn";
import { useSectionTheme } from "../../hooks/useSectionTheme";
import { useMe } from "../../hooks/useAuth";

const LINKS = [
  { label: "Program", to: "/programs" },
  { label: "Pengguna", to: "/users" },
  { label: "Vote Peran", to: "/governance/votes" },
  { label: "Vote Program", to: "/governance/program-votes" },
  { label: "Log Peran", to: "/governance/roles" },
  { label: "Penukaran", to: "/gateway/redemptions" },
  { label: "Tentang", to: "/about" },
];

export function LandingNav() {
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const [atTop, setAtTop] = useState(true);
  const [open, setOpen] = useState(false);
  const theme = useSectionTheme();
  const { data: me } = useMe();

  useMotionValueEvent(scrollY, "change", (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setAtTop(y < 24);
    if (y > prev && y > 220) {
      setHidden(true);
      setOpen(false);
    } else setHidden(false);
  });

  const dark = theme === "dark";
  const textLight = dark; 

  return (
    <motion.header
      initial={false}
      animate={{ y: hidden ? "-140%" : "0%" }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-x-0 top-0 z-50 flex flex-col items-center px-4 pt-3"
    >
      <motion.nav
        initial={false}
        animate={{
          width: atTop ? "100%" : "90%",
          maxWidth: atTop ? 1152 : 1080,
          backgroundColor: atTop
            ? "rgba(255,255,255,0)"
            : "rgba(255,255,255,0.18)",
          backdropFilter: atTop ? "blur(0px)" : "blur(18px)",
          boxShadow: atTop ? "0 0 0 0 rgba(16,24,40,0)" : "",
          borderColor: "rgba(0,0,0,0)",
        }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "mt-4 flex h-14 w-full items-center gap-3 rounded-md border px-3 sm:px-5",
          textLight ? "text-white" : "text-foreground",
        )}
      >
        <Link to="/" className="mr-1 flex flex-col items-center leading-[0.95]">
          <span className="font-display text-[13px] font-bold tracking-[0.2em]">
            GOVERNANCE
          </span>
          <span className="bg-linear-to-r from-brand-mint to-brand-blue bg-clip-text font-display text-[13px] font-bold tracking-[0.36em] text-transparent">
            FUND
          </span>
        </Link>

        <div className="mx-auto hidden items-center gap-7 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="font-display text-[13px] font-medium tracking-tight opacity-75 transition-opacity hover:opacity-100"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          {me ? (
            <Link
              to="/dashboard"
              className="rounded-md bg-foreground px-3.5 py-1.5 text-sm font-medium text-background transition-transform hover:scale-[1.03]"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className={cn(
                  "hidden rounded-md border px-4 py-1.5 text-sm font-medium transition-colors sm:inline-block",
                  textLight
                    ? "border-white/30 hover:bg-white/10"
                    : "border-black/10 hover:bg-muted",
                )}
              >
                Masuk
              </Link>
              <Link
                to="/register"
                className="rounded-md bg-foreground px-3.5 py-1.5 text-sm font-medium text-background transition-transform hover:scale-[1.03]"
              >
                Mulai
              </Link>
            </>
          )}
          <button
            type="button"
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-md border transition-colors md:hidden",
              textLight
                ? "border-white/30 hover:bg-white/10"
                : "border-black/10 hover:bg-muted",
            )}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </motion.nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="mt-2 w-[92%] max-w-sm rounded-xl border border-black/10 bg-white/90 p-2 shadow-lg backdrop-blur-xl md:hidden"
          >
            {LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-4 py-2.5 font-display text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                {l.label}
              </Link>
            ))}
            <Link
              to={me ? "/dashboard" : "/login"}
              onClick={() => setOpen(false)}
              className="mt-1 block rounded-lg border border-black/10 px-4 py-2.5 text-center text-sm font-medium text-foreground transition-colors hover:bg-muted sm:hidden"
            >
              {me ? "Dashboard" : "Masuk"}
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
