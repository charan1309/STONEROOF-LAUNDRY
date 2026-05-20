import { createClient } from '@supabase/supabase-js';

// Replace the text inside the quotes with the keys you just copied!
const supabaseUrl = 'https://pbjrfdmhoiitnkltmnho.supabase.co';
const supabaseAnonKey = 'sb_publishable_CuCmwCM-jnfh6lgr4i2pjw_NLLA8_Qq
';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
