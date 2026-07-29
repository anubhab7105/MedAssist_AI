function normalizeSupabaseUrl(url: string) {
  return url.trim().replace(/\/(?:rest|auth)\/v1\/?$/, "").replace(/\/$/, "");
}

export const supabaseUrl = normalizeSupabaseUrl(
  process.env.NEXT_PUBLIC_SUPABASE_URL!
);

export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
