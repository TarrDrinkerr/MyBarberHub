/* ==========================================================================
   SUPABASE CLIENT CONFIGURATION
   ========================================================================== */

const SUPABASE_URL = 'https://ojbuzzksygkrwuqujcvi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_qfZ6b2_NhAWyu2-kKorLzA_LXXDco3T';

const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;