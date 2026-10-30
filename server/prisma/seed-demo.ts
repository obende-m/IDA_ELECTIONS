/**
 * LOCAL PREVIEW ONLY: fills an empty database with a synthetic election (fake names) so the UI can be
 * demonstrated. Refuses to run unless DATABASE_URL points at a local database.
 *   npx ts-node prisma/seed-demo.ts
 */
import { PrismaClient } from '@prisma/client';
import { generateOpaqueToken, hashToken } from '../src/lib/tokens';
import { encryptToken } from '../src/lib/crypto';
import 'dotenv/config';

const url = process.env.DATABASE_URL ?? '';
if (!/localhost|127\.0\.0\.1/.test(url)) throw new Error('seed-demo only runs against a local database');

const prisma = new PrismaClient();

const POSITIONS = [
  { title: 'President', description: 'Leads the association and chairs the General Assembly.', maxSelections: 1, candidates: ['Adaeze Okafor', 'Babatunde Ilori', 'Chiamaka Eze'] },
  { title: 'Vice President', description: 'Deputises for the President and coordinates committees.', maxSelections: 1, candidates: ['Ibrahim Danjuma', 'Folake Adeyemi'] },
  { title: 'General Secretary', description: 'Keeps records, minutes and correspondence.', maxSelections: 1, candidates: ['Emeka Nwosu', 'Halima Bello', 'Tunde Afolabi'] },
  { title: 'Executive Council', description: 'Three members serve on the Executive Council.', maxSelections: 3, candidates: ['Ngozi Umeh', 'Segun Oladipo', 'Zainab Yusuf', 'Kelechi Obi', 'Amaka Nnaji'] },
];
const WARDS = ['Ward 01 - Okore', 'Ward 02 - Ekpesa', 'Ward 03 - Uma', 'Ward 04 - Ibilo'];
const FIRST = ['Ade', 'Bisi', 'Chidi', 'Dayo', 'Efe', 'Femi', 'Gbenga', 'Hauwa', 'Ife', 'Jide', 'Kemi', 'Lola', 'Musa', 'Nkem', 'Ola', 'Pelumi', 'Remi', 'Sola', 'Tobi', 'Uche'];
const LAST = ['Akande', 'Bakare', 'Coker', 'Dike', 'Eboh', 'Fashola', 'Garba', 'Idowu'];

async function main() {
  if (await prisma.election.count()) {
    console.log('Database already has an election - not seeding demo data.');
    return;
  }
  const admin = await prisma.user.findFirstOrThrow({ where: { role: 'SUPER_ADMIN' } });
  const now = Date.now();
  const election = await prisma.election.create({
    data: {
      title: 'IDA General Election',
      year: 2026,
      description: 'Election of the Executive Officers of the Igarra Development Association.',
      status: 'ACTIVE',
      startTime: new Date(now - 3 * 3600_000),
      endTime: new Date(now + 2 * 86400_000),
    },
  });

  const positions = [];
  for (const [i, p] of POSITIONS.entries()) {
    const pos = await prisma.position.create({ data: { electionId: election.id, title: p.title, description: p.description, maxSelections: p.maxSelections, displayOrder: i } });
    await prisma.positionTally.create({ data: { electionId: election.id, positionId: pos.id } });
    const cands = [];
    for (const [j, name] of p.candidates.entries()) {
      const c = await prisma.candidate.create({ data: { electionId: election.id, positionId: pos.id, name, displayOrder: j, bio: `${name} has served the association in several capacities and stands for ${p.title}.` } });
      await prisma.candidateTally.create({ data: { electionId: election.id, candidateId: c.id, positionId: pos.id } });
      cands.push(c);
    }
    positions.push({ pos, cands, max: p.maxSelections });
  }

  const links: string[] = [];
  for (let i = 0; i < 40; i++) {
    const voter = await prisma.voter.create({
      data: {
        electionId: election.id,
        membershipNumber: `IDA-${String(100 + i).padStart(3, '0')}-${String(200 + i * 7).padStart(3, '0')}`,
        fullName: `${FIRST[i % FIRST.length]} ${LAST[i % LAST.length]}`,
        email: `member${i}@example.org`,
        phone: `0803${String(1000000 + i * 1234).slice(0, 7)}`,
        ward: WARDS[i % WARDS.length],
        isActive: i !== 39,
        votingStatus: i < 34 ? 'ISSUED' : 'NOT_ISSUED',
      },
    });
    if (i < 34) {
      const raw = generateOpaqueToken();
      await prisma.votingToken.create({ data: { electionId: election.id, voterId: voter.id, tokenHash: hashToken(raw), tokenEncrypted: encryptToken(raw), issuedById: admin.id } });
      links.push(`http://localhost:5173/vote/${raw}`);
    }
  }
  console.log('Demo election created. Voting links (first 5):');
  links.slice(0, 5).forEach((l) => console.log('  ' + l));
}

main().finally(() => prisma.$disconnect());
