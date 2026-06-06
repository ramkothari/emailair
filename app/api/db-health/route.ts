import { NextResponse } from "next/server";
import { tursoClient } from "@/db/client";

export const runtime = "nodejs";

const REQUIRED_TABLES = [
  "automations",
  "executions",
  "commits",
  "commit_items",
];

export async function GET() {
  try {
    await tursoClient.execute("select 1 as ok");

    const result = await tursoClient.execute(`
      select name
      from sqlite_master
      where type = 'table'
        and name in ('automations', 'executions', 'commits', 'commit_items')
      order by name
    `);

    const tables = result.rows
      .map((row) => String(row.name))
      .filter((name) => REQUIRED_TABLES.includes(name));

    return NextResponse.json({
      success: tables.length === REQUIRED_TABLES.length,
      database: "connected",
      tableCount: tables.length,
      tables,
      missingTables: REQUIRED_TABLES.filter((table) => !tables.includes(table)),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        database: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
