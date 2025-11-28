// src/cli/prisma-loader.ts

import { PrismaClient } from '@prisma/client';

/**
 * Create Prisma client from connection string
 * 
 * Note: This assumes the user has Prisma set up for their EAV database.
 * The connection string should point to their existing database.
 */
export async function createPrismaClient(connectionString: string): Promise<any> {
  // Extract datasource URL from connection string
  let datasourceUrl = connectionString;
  
  // If it's already an env() reference, resolve it
  if (connectionString.startsWith('env(')) {
    const envVar = connectionString.match(/env\("(.+)"\)/)?.[1];
    if (envVar && process.env[envVar]) {
      datasourceUrl = process.env[envVar];
    }
  }
  
  // Create Prisma client with datasource override
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: datasourceUrl
      }
    }
  });
  
  // Test connection
  try {
    await prisma.$connect();
  } catch (error) {
    throw new Error(`Failed to connect to database: ${(error as Error).message}`);
  }
  
  return prisma;
}