// Supabase settings shared by the portfolio (likes + comments) and the blog.
// Until both are filled in, those only save in each visitor's own browser.
// See docs/SUPABASE-SETUP.md for the steps.
const SUPABASE_URL = "https://wvrcivqjxhdzungifrlf.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_sabK0q2_2t8c_xOfU_kisw_CpnPdC-S"; // publishable key (safe to be public)

// the only account allowed to post on the blog (must match the SQL in the docs)
const BLOG_OWNER_EMAIL = "renran@hackclub.com";


const supabaseKeyHeaders = () =>
  SUPABASE_ANON_KEY.startsWith("eyJ")
    ? { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
    : { apikey: SUPABASE_ANON_KEY };

if (SUPABASE_ANON_KEY.startsWith("sb_secret_"))
  console.error("js/supabase-config.js has a SECRET key. Replace it with the publishable key!");
