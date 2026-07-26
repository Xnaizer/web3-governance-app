import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "../../utils/cn";

const DOW = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function monthGrid(year: number, month: number): (number | null)[] {
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function ClockCard() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const time = now.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const dateLong = now.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const monthName = now.toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
  const cells = monthGrid(now.getFullYear(), now.getMonth());
  const today = now.getDate();

  return (
    <Card className="border-1 border-gray-100 bg-white  shadow-none">
      <CardContent className="flex flex-col gap-3 p-4">
        <div>
          <p className="font-mono text-2xl font-bold tracking-tight text-brand-blue sm:text-3xl">
            {time}
          </p>
          <p className="text-sm text-muted-foreground">{dateLong}</p>
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
            {monthName}
          </p>
          <div className="grid grid-cols-7 gap-0.5 text-center text-[10px]">
            {DOW.map((d) => (
              <span
                key={d}
                className="py-0.5 font-medium text-muted-foreground/70"
              >
                {d}
              </span>
            ))}
            {cells.map((c, i) => (
              <span
                key={i}
                className={cn(
                  "rounded py-0.5",
                  c === today
                    ? "bg-brand-blue font-bold text-white"
                    : c
                    ? "text-foreground/80"
                    : "",
                )}
              >
                {c ?? ""}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
