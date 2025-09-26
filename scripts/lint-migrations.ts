import { promises as fs } from 'node:fs';
import path from 'node:path';

const MIGRATIONS_DIR = path.join(process.cwd(), 'supabase', 'migrations');
const MIGRATION_NAME_REGEX = /^\d{8}_[a-z0-9_]+\.sql$/;

const TABLE_REGEX = /CREATE\s+TABLE\s+(?!IF\s+NOT\s+EXISTS)([^\s(]+)/gi;
const INDEX_REGEX = /CREATE\s+(UNIQUE\s+)?INDEX\s+(?!IF\s+NOT\s+EXISTS)([^\s(]+)/gi;

type Violation = {
  file: string;
  line: number;
  message: string;
};

function stripComments(sql: string): string {
  return sql
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, (match) => match.replace(/[^\n]/g, ''));
}

function getLineNumber(content: string, index: number): number {
  return content.slice(0, index).split('\n').length;
}

async function lintMigrations(): Promise<void> {
  const problems: Violation[] = [];
  const entries = await fs.readdir(MIGRATIONS_DIR, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile()) continue;

    const fileName = entry.name;
    if (!MIGRATION_NAME_REGEX.test(fileName)) {
      problems.push({
        file: fileName,
        line: 0,
        message:
          'Filename must follow YYYYMMDD_snake_case.sql (lowercase, numbers, and underscores).',
      });
    }

    const filePath = path.join(MIGRATIONS_DIR, fileName);
    const rawContent = await fs.readFile(filePath, 'utf8');
    const sanitized = stripComments(rawContent);

    let tableMatch: RegExpExecArray | null;
    while ((tableMatch = TABLE_REGEX.exec(sanitized)) !== null) {
      problems.push({
        file: fileName,
        line: getLineNumber(sanitized, tableMatch.index),
        message: `Use "CREATE TABLE IF NOT EXISTS" when defining ${tableMatch[1]}.`,
      });
    }
    TABLE_REGEX.lastIndex = 0;

    let indexMatch: RegExpExecArray | null;
    while ((indexMatch = INDEX_REGEX.exec(sanitized)) !== null) {
      problems.push({
        file: fileName,
        line: getLineNumber(sanitized, indexMatch.index),
        message: `Use "CREATE INDEX IF NOT EXISTS" when defining ${indexMatch[2]}.`,
      });
    }
    INDEX_REGEX.lastIndex = 0;
  }

  if (problems.length > 0) {
    const details = problems
      .map((problem) => {
        const location = problem.line > 0 ? `${problem.file}:${problem.line}` : problem.file;
        return `- ${location}: ${problem.message}`;
      })
      .join('\n');
    console.error('Migration linting failed:\n' + details);
    process.exitCode = 1;
    return;
  }

  console.log('All migrations follow naming and IF NOT EXISTS conventions.');
}

lintMigrations().catch((error) => {
  console.error('Unexpected error while linting migrations.');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
