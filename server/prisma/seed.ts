import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/password';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const fullName = process.env.SEED_ADMIN_NAME;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !fullName || !password) {
    throw new Error('SEED_ADMIN_EMAIL, SEED_ADMIN_NAME, and SEED_ADMIN_PASSWORD must be set to seed the bootstrap admin.');
  }

  const passwordHash = await hashPassword(password);

  // SUPER_ADMIN: the platform requires at least one account able to unlock a locked election;
  // this bootstrap account is it. Additional ADMIN accounts are created by the Super Admin
  // once a user-management screen exists.
  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, fullName, passwordHash, role: 'SUPER_ADMIN' },
  });

  console.log(`Bootstrap super admin ready: ${admin.email}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
