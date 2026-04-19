

// const { createClient } = supabase;

// window.supabaseClient = createClient(
//   "https://yvmuqqfdtkzyyeyesrlk.supabase.co",
//   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2bXVxcWZkdGt6eXlleWVzcmxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMTY5MjcsImV4cCI6MjA4NzU5MjkyN30.4JZqH_KzrsTtaP35aL0fW_wtvJl9-DlC84NzcQhtJto"
// );


const supabaseUrl = "https://yvmuqqfdtkzyyeyesrlk.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2bXVxcWZkdGt6eXlleWVzcmxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMTY5MjcsImV4cCI6MjA4NzU5MjkyN30.4JZqH_KzrsTtaP35aL0fW_wtvJl9-DlC84NzcQhtJto";

window.supabaseClient = supabase.createClient(
  supabaseUrl,
  supabaseKey
);

console.log("Supabase client initialized:", window.supabaseClient);


















// const SUPABASE_URL = "https://yvmuqqfdtkzyyeyesrlk.supabase.co";
// const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2bXVxcWZkdGt6eXlleWVzcmxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMTY5MjcsImV4cCI6MjA4NzU5MjkyN30.4JZqH_KzrsTtaP35aL0fW_wtvJl9-DlC84NzcQhtJto";

// window.supabaseClient = supabase.createClient(
//   SUPABASE_URL,
//   SUPABASE_ANON_KEY
// );


// CRIGPSIS2026

