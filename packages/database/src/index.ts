import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

dotenv.config();

export const prisma = new PrismaClient();

export const prismaDirect = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL,
});

export * from "@prisma/client";
