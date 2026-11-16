import 'dotenv/config';
import { PrismaNeonHttp } from '@prisma/adapter-neon';
import { PrismaClient } from '@prisma/client';

async function test() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL not set');
  
  const adapter = new PrismaNeonHttp(connectionString, {});
  const prisma = new PrismaClient({ adapter });

  try {
    const orgs = await prisma.organization.findMany();
    console.log('🎉 PrismaNeonHttp query success! Orgs in DB:', orgs);
  } catch (err) {
    console.error('Error querying:', err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
