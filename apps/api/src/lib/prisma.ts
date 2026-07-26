import { prisma, prismaDirect, Prisma } from "@repo/database";
export { prisma, prismaDirect };

export function txDirect<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prismaDirect.$transaction(fn, { maxWait: 5000, timeout: 15000 });
}
