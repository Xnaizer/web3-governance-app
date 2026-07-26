import { useQuery } from "@tanstack/react-query";
import {
  Sun,
  Cloud,
  CloudSun,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Droplets,
  Wind,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const LAT = -6.2088;
const LON = 106.8456;
const CITY = "Jakarta";
const URL =
  `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
  `&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m&timezone=auto`;

interface CurrentWeather {
  temperature_2m: number;
  weather_code: number;
  relative_humidity_2m: number;
  wind_speed_10m: number;
}

async function fetchWeather(): Promise<CurrentWeather> {
  const res = await fetch(URL);
  if (!res.ok) throw new Error("weather fetch failed");
  const json = await res.json();
  return json.current as CurrentWeather;
}

function describe(code: number): {
  label: string;
  Icon: LucideIcon;
  color: string;
} {
  if (code === 0) return { label: "Cerah", Icon: Sun, color: "#f59e0b" };
  if (code <= 2)
    return { label: "Cerah berawan", Icon: CloudSun, color: "#38BDF8" };
  if (code === 3) return { label: "Berawan", Icon: Cloud, color: "#94a3b8" };
  if (code <= 48)
    return { label: "Berkabut", Icon: CloudFog, color: "#94a3b8" };
  if (code <= 57)
    return { label: "Gerimis", Icon: CloudDrizzle, color: "#4899EA" };
  if (code <= 67) return { label: "Hujan", Icon: CloudRain, color: "#4899EA" };
  if (code <= 77) return { label: "Salju", Icon: CloudSnow, color: "#818CF8" };
  if (code <= 82)
    return { label: "Hujan lebat", Icon: CloudRain, color: "#2f79d4" };
  if (code <= 86)
    return { label: "Salju lebat", Icon: CloudSnow, color: "#818CF8" };
  return { label: "Badai petir", Icon: CloudLightning, color: "#C084FC" };
}

export function WeatherCard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["weather", CITY],
    queryFn: fetchWeather,
    staleTime: 30 * 60_000, 
    retry: 1,
  });

  const w = data ? describe(data.weather_code) : null;

  return (
    <Card className="rounded-2xl border-black/5 ">
      <CardContent className="flex items-center gap-4 p-4">
        {isLoading ? (
          <div className="flex w-full items-center gap-4">
            <div className="h-12 w-12 animate-pulse rounded-xl bg-muted" />
            <div className="flex flex-col gap-2">
              <div className="h-6 w-20 animate-pulse rounded bg-muted" />
              <div className="h-3 w-28 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ) : isError || !data || !w ? (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <CloudFog className="h-6 w-6" />
            Cuaca tak tersedia
          </div>
        ) : (
          <>
            <span
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
              style={{ color: w.color }}
            >
              <w.Icon className="h-7 w-7" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-1">
                <span className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                  {Math.round(data.temperature_2m)}
                </span>
                <span className="text-lg text-muted-foreground">°C</span>
              </div>
              <p className="text-sm font-medium">{w.label}</p>
              <p className="text-xs text-muted-foreground">{CITY} · hari ini</p>
            </div>
            <div className="flex shrink-0 flex-col gap-1.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Droplets className="h-3.5 w-3.5" /> {data.relative_humidity_2m}
                %
              </span>
              <span className="flex items-center gap-1.5">
                <Wind className="h-3.5 w-3.5" />{" "}
                {Math.round(data.wind_speed_10m)} km/j
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
