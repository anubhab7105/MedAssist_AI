import { createBrowserClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/config";

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
