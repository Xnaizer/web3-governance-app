import { memGet, memSet, memDel, memDelPattern } from "./memoryCache";

export async function cacheAside<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  console.time(`cache:${key}`);

  const cached = memGet(key);
  if (cached !== null) {
    console.timeEnd(`cache:${key}`);
    return JSON.parse(cached) as T;
  }

  const fresh = await fetcher();
  memSet(key, JSON.stringify(fresh), ttlSeconds);

  console.timeEnd(`cache:${key}`);
  return fresh;
}

export async function invalidate(key: string): Promise<void> {
  memDel(key);
}

export async function invalidatePattern(pattern: string): Promise<void> {
  memDelPattern(pattern);
}
