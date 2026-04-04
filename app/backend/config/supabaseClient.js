const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
// Use service role key for backend admin operations, fallback to anon key or placeholder
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn("⚠️  Warning: Supabase URL or Key is missing from the environment variables. Ensure .env is set up correctly.");
}

// Initialize the Supabase Client
const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co', 
    supabaseKey || 'placeholder-key'
);

module.exports = supabase;
