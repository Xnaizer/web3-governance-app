import { Link } from "react-router-dom";
import { Circle, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { AuthUser } from "../../../types/auth";

export function OnboardingChecklist({ me }: { me: AuthUser }) {
  const steps = [
    { done: me.isActive, label: "Verifikasi email" },
    { done: !!me.name, label: "Lengkapi data profil" },
    { done: !!me.walletAddress, label: "Bind wallet (di Profil)" },
    { done: me.isVerified, label: "Identitas diverifikasi admin" },
    { done: me.role !== "USER", label: "Dipromosikan ke peran governance" },
  ];
  const done = steps.filter((s) => s.done).length;
  return (
    <Card>
      <CardHeader className="font-semibold">
        Langkah Onboarding ({done}/{steps.length})
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {steps.map((s) => (
          <div key={s.label} className="flex items-center gap-2 text-sm">
            {s.done ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground/40" />
            )}
            <span
              className={
                s.done ? "text-foreground/80" : "text-muted-foreground"
              }
            >
              {s.label}
            </span>
          </div>
        ))}
        {!me.walletAddress && (
          <Button asChild size="sm" variant="secondary" className="mt-2 w-fit">
            <Link to="/profile">Ke Profil</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
