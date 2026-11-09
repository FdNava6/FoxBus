// Copia lógica portable de MySQL: no depende de mysqldump y conserva el mismo
// formato cifrado autenticado que usa la CLI de FOXBus.
export function dumpDatabase(db, { database } = {}) {
  const tables = db
    .prepare("SHOW TABLES")
    .all()
    .map((row) => String(Object.values(row)[0]));
  return {
    format: "foxbus-mysql-dump",
    version: 1,
    database: database || db.databaseName,
    createdAt: new Date().toISOString(),
    tables: tables
      .sort()
      .map((name) => ({
        name,
        createSql: db.prepare("SHOW CREATE TABLE `" + name + "`").get()[
          "Create Table"
        ],
        rows: db.prepare("SELECT * FROM `" + name + "`").all(),
      })),
  };
}

export function serializeDump(dump) {
  return Buffer.from(JSON.stringify(dump), "utf8");
}

export function parseDump(bytes) {
  const dump = JSON.parse(Buffer.from(bytes).toString("utf8"));
  if (dump.format !== "foxbus-mysql-dump" || dump.version !== 1)
    throw new Error("El archivo no es una copia compatible de FOXBus.");
  if (!Array.isArray(dump.tables) || dump.tables.length === 0)
    throw new Error("La copia no contiene tablas.");
  for (const table of dump.tables)
    if (!table.name || !table.createSql || !Array.isArray(table.rows))
      throw new Error("La copia contiene una tabla incompleta.");
  return dump;
}

export function restoreDatabase(dump, db) {
  db.exec("SET FOREIGN_KEY_CHECKS=0");
  try {
    for (const table of dump.tables) {
      db.exec(
        table.createSql.replace(/^CREATE TABLE/, "CREATE TABLE IF NOT EXISTS"),
      );
      for (const row of table.rows) {
        const columns = Object.keys(row);
        if (columns.length === 0) continue;
        db.prepare(
          "INSERT IGNORE INTO `" +
            table.name +
            "` (" +
            columns.map((column) => "`" + column + "`").join(",") +
            ") VALUES (" +
            columns.map(() => "?").join(",") +
            ")",
        ).run(...columns.map((column) => row[column]));
      }
    }
  } finally {
    db.exec("SET FOREIGN_KEY_CHECKS=1");
  }
  return dump.tables.length;
}
