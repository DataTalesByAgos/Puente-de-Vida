import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync('pdv-mobile.db');
    await initSchema();
  }
  return db;
}

async function initSchema(): Promise<void> {
  const database = db!;
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS needs (
      id TEXT PRIMARY KEY,
      client_id TEXT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      subcategory TEXT,
      priority TEXT NOT NULL DEFAULT 'media',
      status TEXT NOT NULL DEFAULT 'abierta',
      scope TEXT NOT NULL DEFAULT 'micro',
      parent_id TEXT,
      lat REAL,
      lng REAL,
      location_text TEXT,
      organization_id TEXT,
      org_name TEXT,
      people_required INTEGER,
      resources_needed TEXT,
      comments TEXT,
      created_by TEXT,
      created_by_role TEXT,
      assigned_to TEXT,
      assigned_by TEXT,
      assigned_at TEXT,
      closed_by TEXT,
      closed_at TEXT,
      source TEXT NOT NULL DEFAULT 'pwa',
      photo_url TEXT,
      age INTEGER,
      is_minor INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS need_updates (
      id TEXT PRIMARY KEY,
      need_id TEXT NOT NULL,
      volunteer_id TEXT NOT NULL,
      status TEXT NOT NULL,
      photos TEXT DEFAULT '[]',
      observations TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pending_sync (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
}

export async function saveNeedsLocally(needs: any[]): Promise<void> {
  const database = await getDb();
  const stmt = await database.prepareAsync(`
    INSERT OR REPLACE INTO needs
      (id, client_id, title, description, category, subcategory,
       priority, status, scope, parent_id, lat, lng, location_text,
       organization_id, org_name, people_required, resources_needed,
       comments, created_by, created_by_role, assigned_to, assigned_by,
       assigned_at, closed_by, closed_at, source, photo_url, age, is_minor,
       created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `);
  for (const n of needs) {
    await stmt.executeAsync([
      n.id,
      n.client_id,
      n.title,
      n.description,
      n.category,
      n.subcategory,
      n.priority,
      n.status,
      n.scope,
      n.parent_id,
      n.lat,
      n.lng,
      n.location_text,
      n.organization_id,
      n.org_name,
      n.people_required,
      n.resources_needed,
      n.comments,
      n.created_by,
      n.created_by_role,
      n.assigned_to,
      n.assigned_by,
      n.assigned_at,
      n.closed_by,
      n.closed_at,
      n.source,
      n.photo_url,
      n.age,
      n.is_minor ? 1 : 0,
      n.created_at,
      n.updated_at,
    ]);
  }
  await stmt.finalizeAsync();
}

export async function getLocalNeeds(params?: {
  status?: string;
  category?: string;
  scope?: string;
  assignedTo?: string;
}): Promise<any[]> {
  const database = await getDb();
  let sql = 'SELECT * FROM needs WHERE 1=1';
  const args: any[] = [];
  if (params?.status) {
    sql += ' AND status = ?';
    args.push(params.status);
  }
  if (params?.category) {
    sql += ' AND category = ?';
    args.push(params.category);
  }
  if (params?.scope) {
    sql += ' AND scope = ?';
    args.push(params.scope);
  }
  if (params?.assignedTo) {
    sql += ' AND assigned_to = ?';
    args.push(params.assignedTo);
  }
  sql += ' ORDER BY created_at DESC';
  return database.getAllAsync(sql, args);
}
