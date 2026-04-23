/**
 * Crea un usuario admin con email + password temporal.
 * Forza cambio de password en primer login via app_metadata.must_change_password.
 *
 * Uso: EMAIL=x@y.co FULL_NAME="Nombre" node supabase/scripts/create_admin_user.js
 */
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const EMAIL = process.env.EMAIL;
const FULL_NAME = process.env.FULL_NAME || "Admin Aluri";
if (!EMAIL) {
  console.error("Falta env EMAIL");
  process.exit(1);
}

function genPassword(len = 14) {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = require("crypto").randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += chars[bytes[i] % chars.length];
  return out;
}

(async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
    process.exit(1);
  }
  const sb = createClient(url, key, { auth: { persistSession: false } });

  // Verify email not already registered
  const existing = await sb.auth.admin.listUsers();
  const dup = (existing.data?.users || []).find(
    (u) => u?.email?.toLowerCase() === EMAIL.toLowerCase(),
  );
  if (dup) {
    console.error(`Ya existe un usuario con email ${EMAIL} (id=${dup.id})`);
    process.exit(1);
  }

  const tempPassword = genPassword(14);
  const { data: created, error: createErr } = await sb.auth.admin.createUser({
    email: EMAIL,
    password: tempPassword,
    email_confirm: true,
    app_metadata: { must_change_password: true },
    user_metadata: { full_name: FULL_NAME },
  });
  if (createErr || !created?.user) {
    console.error("Error creando auth user:", createErr?.message || "desconocido");
    process.exit(1);
  }
  const userId = created.user.id;
  console.log("Auth user creado:", userId);

  // Create profile with role=admin
  const { error: profErr } = await sb.from("profiles").insert({
    id: userId,
    email: EMAIL,
    full_name: FULL_NAME,
    role: "admin",
  });
  if (profErr) {
    console.error("Error creando profile:", profErr.message);
    // Rollback auth user
    await sb.auth.admin.deleteUser(userId);
    console.error("Auth user eliminado (rollback)");
    process.exit(1);
  }

  console.log("\n=== LISTO ===");
  console.log("Email:", EMAIL);
  console.log("Password temporal:", tempPassword);
  console.log("Role: admin");
  console.log("\nEn el primer login va a tener que cambiarla.");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
