const { Client } = require("pg");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const ask = (q) => new Promise((r) => rl.question(q, r));

async function main() {
  console.log("=== Migracion: Agregar columnas a appointments ===\n");
  console.log("Necesitas la DATABASE PASSWORD de Supabase:");
  console.log("  Supabase Dashboard > Settings > Database > Database password\n");

  const password = await ask("Pega la DATABASE PASSWORD: ");
  rl.close();

  const client = new Client({
    host: "db.zxlslfzwtyrsrmvvqsll.supabase.co",
    port: 5432,
    database: "postgres",
    user: "postgres",
    password: password.trim(),
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log("\nConectado a Supabase PostgreSQL\n");

    const columns = [
      `ALTER TABLE appointments ADD COLUMN IF NOT EXISTS risk_level TEXT DEFAULT 'medium'`,
      `ALTER TABLE appointments ADD COLUMN IF NOT EXISTS urgency TEXT DEFAULT 'normal'`,
      `ALTER TABLE appointments ADD COLUMN IF NOT EXISTS attention_type TEXT DEFAULT 'control'`,
      `ALTER TABLE appointments ADD COLUMN IF NOT EXISTS temperature TEXT`,
      `ALTER TABLE appointments ADD COLUMN IF NOT EXISTS blood_pressure TEXT`,
      `ALTER TABLE appointments ADD COLUMN IF NOT EXISTS heart_rate TEXT`,
      `ALTER TABLE appointments ADD COLUMN IF NOT EXISTS weight TEXT`,
      `ALTER TABLE appointments ADD COLUMN IF NOT EXISTS intervention_type TEXT DEFAULT 'individual'`,
      `ALTER TABLE appointments ADD COLUMN IF NOT EXISTS referral_source TEXT DEFAULT 'self'`,
      `ALTER TABLE appointments ADD COLUMN IF NOT EXISTS referral_details TEXT`,
    ];

    for (const sql of columns) {
      const col = sql.match(/ADD COLUMN IF NOT EXISTS (\w+)/)[1];
      process.stdout.write(`  Agregando ${col}... `);
      await client.query(sql);
      console.log("OK");
    }

    console.log("\nMigracion completada exitosamente!");
  } catch (err) {
    console.error("\nError:", err.message);
    if (err.message.includes("password authentication failed")) {
      console.error("La password no es correcta. Verificala en Supabase Dashboard > Settings > Database > Database password");
    }
  } finally {
    await client.end();
  }
}

main();
