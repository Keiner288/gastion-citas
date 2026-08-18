import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://zxlslfzwtyrsrmvvqsll.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4bHNsZnp3dHlyc3JtdnZxc2xsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5NDU4OTksImV4cCI6MjA5MzUyMTg5OX0.rXlJpfL_-9YjfigZclxOdfFg1tVvcPQbnzwsX89Il_8";

const supabase = createClient(supabaseUrl, supabaseKey);

const testUsers = [
  { email: "test@test.com", password: "password" },
  { email: "testnoverify@test.com", password: "password" },
  { email: "testnoverify@test.com", password: "password123" },
  { email: "admin@test.com", password: "admin123" },
];

console.log("Probando login con Supabase...\n");

for (const u of testUsers) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: u.email,
    password: u.password,
  });
  if (error) {
    console.log(`❌ ${u.email} / ${u.password} -> ERROR: ${error.message} (status: ${error.status})`);
  } else {
    console.log(`✅ ${u.email} / ${u.password} -> OK! User ID: ${data.user?.id}`);
    await supabase.auth.signOut();
  }
}
