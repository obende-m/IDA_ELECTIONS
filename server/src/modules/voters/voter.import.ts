import { parse } from 'csv-parse/sync';
import ExcelJS from 'exceljs';
import { prisma } from '../../lib/prisma';
import { writeAuditLog } from '../../lib/audit';
import { assertElectionNotLocked } from '../../lib/electionLock';
import type { Actor } from './voter.service';

interface RawRow {
  [key: string]: unknown;
}

interface ParsedRow {
  rowNumber: number;
  membershipNumber: string;
  fullName: string;
  email?: string;
  phone?: string;
  ward?: string;
  isActive: boolean;
}

export interface ImportReport {
  totalRows: number;
  imported: Array<{ row: number; membershipNumber: string }>;
  updated: Array<{ row: number; membershipNumber: string }>;
  skipped: Array<{ row: number; membershipNumber: string; reason: string }>;
  duplicates: Array<{ row: number; membershipNumber: string }>;
  invalid: Array<{ row: number; reason: string }>;
}

const HEADER_ALIASES: Record<string, keyof ParsedRow | 'skip'> = {
  membershipnumber: 'membershipNumber',
  'membership number': 'membershipNumber',
  'membership no': 'membershipNumber',
  membershipno: 'membershipNumber',
  fullname: 'fullName',
  'full name': 'fullName',
  name: 'fullName',
  phonenumber: 'phone',
  'phone number': 'phone',
  phone: 'phone',
  emailaddress: 'email',
  'email address': 'email',
  email: 'email',
  ward: 'ward',
  status: 'isActive',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase();
}

function rowsFromCsv(buffer: Buffer): RawRow[] {
  return parse(buffer, { columns: true, skip_empty_lines: true, trim: true }) as RawRow[];
}

async function rowsFromExcel(buffer: Buffer): Promise<RawRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as any);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const headerRow = sheet.getRow(1).values as unknown[];
  const headers = headerRow.map((h) => (typeof h === 'string' ? h : String(h ?? '')));

  const rows: RawRow[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const values = row.values as unknown[];
    const record: RawRow = {};
    headers.forEach((header, i) => {
      if (!header) return;
      record[header] = values[i];
    });
    rows.push(record);
  });
  return rows;
}

function coerceIsActive(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return true;
  const normalized = String(value).trim().toLowerCase();
  return !['inactive', 'false', '0', 'no'].includes(normalized);
}

function parseRow(raw: RawRow, rowNumber: number): { row?: ParsedRow; error?: string } {
  const mapped: Partial<ParsedRow> = {};
  for (const [key, value] of Object.entries(raw)) {
    const field = HEADER_ALIASES[normalizeHeader(key)];
    if (!field || field === 'skip') continue;
    if (field === 'isActive') {
      mapped.isActive = coerceIsActive(value);
    } else {
      (mapped as any)[field] = value === undefined || value === null ? '' : String(value).trim();
    }
  }

  const membershipNumber = mapped.membershipNumber?.trim();
  const fullName = mapped.fullName?.trim();

  if (!membershipNumber) return { error: 'Missing membership number' };
  if (!fullName) return { error: 'Missing full name' };
  if (mapped.email && !EMAIL_RE.test(mapped.email)) return { error: `Invalid email: ${mapped.email}` };

  return {
    row: {
      rowNumber,
      membershipNumber,
      fullName,
      email: mapped.email || undefined,
      phone: mapped.phone || undefined,
      ward: mapped.ward || undefined,
      isActive: mapped.isActive ?? true,
    },
  };
}

/**
 * Imports voters from a CSV or XLSX buffer. Each row is applied as its own create/update so a
 * large file doesn't hold one long-running transaction; the summary report is built as rows are
 * processed and a single audit log entry captures the whole batch.
 */
export async function importVoters(
  electionId: string,
  file: { buffer: Buffer; originalname: string; mimetype: string },
  actor: Actor,
  req?: import('express').Request
): Promise<ImportReport> {
  await assertElectionNotLocked(electionId);

  const isExcel = /\.xlsx?$/i.test(file.originalname) || file.mimetype.includes('sheet') || file.mimetype.includes('excel');
  const rawRows = isExcel ? await rowsFromExcel(file.buffer) : rowsFromCsv(file.buffer);

  const report: ImportReport = { totalRows: rawRows.length, imported: [], updated: [], skipped: [], duplicates: [], invalid: [] };
  const seenInFile = new Set<string>();

  for (let i = 0; i < rawRows.length; i++) {
    const rowNumber = i + 2; // account for the header row
    const { row, error } = parseRow(rawRows[i], rowNumber);

    if (error || !row) {
      report.invalid.push({ row: rowNumber, reason: error ?? 'Invalid row' });
      continue;
    }

    if (seenInFile.has(row.membershipNumber)) {
      report.duplicates.push({ row: rowNumber, membershipNumber: row.membershipNumber });
      continue;
    }
    seenInFile.add(row.membershipNumber);

    const existing = await prisma.voter.findUnique({
      where: { electionId_membershipNumber: { electionId, membershipNumber: row.membershipNumber } },
    });

    if (!existing) {
      await prisma.voter.create({
        data: {
          electionId,
          membershipNumber: row.membershipNumber,
          fullName: row.fullName,
          email: row.email,
          phone: row.phone,
          ward: row.ward,
          isActive: row.isActive,
        },
      });
      report.imported.push({ row: rowNumber, membershipNumber: row.membershipNumber });
      continue;
    }

    const changed =
      existing.fullName !== row.fullName ||
      (existing.email ?? undefined) !== row.email ||
      (existing.phone ?? undefined) !== row.phone ||
      (existing.ward ?? undefined) !== row.ward ||
      existing.isActive !== row.isActive;

    if (!changed) {
      report.skipped.push({ row: rowNumber, membershipNumber: row.membershipNumber, reason: 'No changes' });
      continue;
    }

    await prisma.voter.update({
      where: { id: existing.id },
      data: { fullName: row.fullName, email: row.email, phone: row.phone, ward: row.ward, isActive: row.isActive },
    });
    report.updated.push({ row: rowNumber, membershipNumber: row.membershipNumber });
  }

  await writeAuditLog({
    action: 'VOTER_IMPORT_COMPLETED',
    actorId: actor.id,
    actorRole: actor.role,
    actorName: actor.fullName,
    electionId,
    metadata: {
      fileName: file.originalname,
      totalRows: report.totalRows,
      imported: report.imported.length,
      updated: report.updated.length,
      skipped: report.skipped.length,
      duplicates: report.duplicates.length,
      invalid: report.invalid.length,
    },
    req,
  });

  return report;
}
