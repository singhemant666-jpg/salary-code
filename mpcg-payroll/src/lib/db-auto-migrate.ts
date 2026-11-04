import { prisma } from './prisma';

let syncPromise: Promise<void> | null = null;
let hasSynced = false;

interface ColumnCheck {
  table: string;
  column: string;
  sql: string;
}

const REQUIRED_COLUMNS: ColumnCheck[] = [
  { table: 'employees', column: 'ptApplicable', sql: 'ALTER TABLE employees ADD COLUMN ptApplicable TINYINT(1) NOT NULL DEFAULT 1' },
  { table: 'employees', column: 'openingPaidLeavesUsed', sql: 'ALTER TABLE employees ADD COLUMN openingPaidLeavesUsed INT NOT NULL DEFAULT 0' },
  { table: 'employees', column: 'missingPunchPenalty', sql: 'ALTER TABLE employees ADD COLUMN missingPunchPenalty TINYINT(1) NOT NULL DEFAULT 1' },
  { table: 'employees', column: 'strictLateRule', sql: 'ALTER TABLE employees ADD COLUMN strictLateRule TINYINT(1) NOT NULL DEFAULT 1' },
  { table: 'employees', column: 'sandwichRule', sql: 'ALTER TABLE employees ADD COLUMN sandwichRule TINYINT(1) NOT NULL DEFAULT 0' },
  { table: 'employees', column: 'tdsEnabled', sql: 'ALTER TABLE employees ADD COLUMN tdsEnabled TINYINT(1) NOT NULL DEFAULT 0' },
  { table: 'employees', column: 'tdsPercentage', sql: 'ALTER TABLE employees ADD COLUMN tdsPercentage DECIMAL(5,2) NOT NULL DEFAULT 10.00' },
  { table: 'employees', column: 'tdsMode', sql: 'ALTER TABLE employees ADD COLUMN tdsMode VARCHAR(191) NOT NULL DEFAULT "PERCENTAGE"' },
  { table: 'employees', column: 'tdsAmount', sql: 'ALTER TABLE employees ADD COLUMN tdsAmount DECIMAL(12,2) NULL' },
  { table: 'users', column: 'permissions', sql: 'ALTER TABLE users ADD COLUMN permissions TEXT NULL' },
  { table: 'monthly_payroll', column: 'waiveLopDeduction', sql: 'ALTER TABLE monthly_payroll ADD COLUMN waiveLopDeduction TINYINT(1) NOT NULL DEFAULT 0' },
  { table: 'monthly_payroll', column: 'waiveLatePenaltyDeduction', sql: 'ALTER TABLE monthly_payroll ADD COLUMN waiveLatePenaltyDeduction TINYINT(1) NOT NULL DEFAULT 0' },
  { table: 'monthly_payroll', column: 'waiveSuddenLeaveDeduction', sql: 'ALTER TABLE monthly_payroll ADD COLUMN waiveSuddenLeaveDeduction TINYINT(1) NOT NULL DEFAULT 0' },
  { table: 'monthly_payroll', column: 'waivePtDeduction', sql: 'ALTER TABLE monthly_payroll ADD COLUMN waivePtDeduction TINYINT(1) NOT NULL DEFAULT 0' },
  { table: 'monthly_payroll', column: 'waiveMissingPunchDeduction', sql: 'ALTER TABLE monthly_payroll ADD COLUMN waiveMissingPunchDeduction TINYINT(1) NOT NULL DEFAULT 0' },
  { table: 'monthly_payroll', column: 'ptDeduction', sql: 'ALTER TABLE monthly_payroll ADD COLUMN ptDeduction DECIMAL(12,2) NOT NULL DEFAULT 0' },
  { table: 'monthly_payroll', column: 'shortHoursDeduction', sql: 'ALTER TABLE monthly_payroll ADD COLUMN shortHoursDeduction DECIMAL(12,2) NOT NULL DEFAULT 0' },
  { table: 'monthly_payroll', column: 'waiveShortHoursDeduction', sql: 'ALTER TABLE monthly_payroll ADD COLUMN waiveShortHoursDeduction TINYINT(1) NOT NULL DEFAULT 0' },
  { table: 'monthly_payroll', column: 'isShortHoursCustomized', sql: 'ALTER TABLE monthly_payroll ADD COLUMN isShortHoursCustomized TINYINT(1) NOT NULL DEFAULT 0' },
  { table: 'monthly_payroll', column: 'holdSalaryDeduction', sql: 'ALTER TABLE monthly_payroll ADD COLUMN holdSalaryDeduction DECIMAL(12,2) NOT NULL DEFAULT 0' },
  { table: 'monthly_payroll', column: 'holdSalaryReleaseAmount', sql: 'ALTER TABLE monthly_payroll ADD COLUMN holdSalaryReleaseAmount DECIMAL(12,2) NOT NULL DEFAULT 0' },
  { table: 'monthly_payroll', column: 'holdSalaryReleaseReason', sql: 'ALTER TABLE monthly_payroll ADD COLUMN holdSalaryReleaseReason TEXT NULL' },
  { table: 'monthly_payroll', column: 'isTdsCustomized', sql: 'ALTER TABLE monthly_payroll ADD COLUMN isTdsCustomized TINYINT(1) NOT NULL DEFAULT 0' },
  { table: 'monthly_payroll', column: 'tdsDeduction', sql: 'ALTER TABLE monthly_payroll ADD COLUMN tdsDeduction DECIMAL(12,2) NOT NULL DEFAULT 0' },
];

export async function ensureDatabaseSchemaSynced(): Promise<void> {
  if (hasSynced) return;
  if (syncPromise) return syncPromise;

  syncPromise = (async () => {
    try {
      for (const item of REQUIRED_COLUMNS) {
        try {
          const existing: any[] = await prisma.$queryRawUnsafe(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${item.table}' AND COLUMN_NAME = '${item.column}'
          `);
          if (!existing || existing.length === 0) {
            console.log(`[AutoMigrate] Adding missing column ${item.table}.${item.column}...`);
            await prisma.$executeRawUnsafe(item.sql);
            console.log(`[AutoMigrate] Successfully added ${item.table}.${item.column}`);
          }
        } catch (colErr) {
          console.warn(`[AutoMigrate] Column check error on ${item.table}.${item.column}:`, colErr);
        }
      }

      // Check table employee_documents
      try {
        const tableCheck: any[] = await prisma.$queryRawUnsafe(`
          SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'employee_documents'
        `);
        if (!tableCheck || tableCheck.length === 0) {
          console.log('[AutoMigrate] Creating table employee_documents...');
          await prisma.$executeRawUnsafe(`
            CREATE TABLE employee_documents (
              id VARCHAR(191) NOT NULL,
              employeeId VARCHAR(191) NOT NULL,
              docType VARCHAR(191) NOT NULL,
              label VARCHAR(191) NOT NULL,
              fileName VARCHAR(191) NOT NULL,
              filePath VARCHAR(191) NOT NULL,
              fileSize INT NOT NULL,
              mimeType VARCHAR(191) NOT NULL,
              uploadedBy VARCHAR(191) NULL,
              uploadedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
              notes TEXT NULL,
              PRIMARY KEY (id),
              INDEX employee_documents_employeeId_idx (employeeId),
              CONSTRAINT employee_documents_employeeId_fkey FOREIGN KEY (employeeId) REFERENCES employees(id) ON DELETE CASCADE ON UPDATE CASCADE
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
          `);
          console.log('[AutoMigrate] Created employee_documents table successfully');
        }
      } catch (tblErr) {
        console.warn('[AutoMigrate] Table check error on employee_documents:', tblErr);
      }

      hasSynced = true;
    } catch (err) {
      console.error('[AutoMigrate] Unexpected schema sync error:', err);
    } finally {
      syncPromise = null;
    }
  })();

  return syncPromise;
}
