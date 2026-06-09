import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const academyWebUrl = process.env.EXPO_PUBLIC_ACADEMY_WEB_URL ?? "https://academy-for-financial-future.vercel.app";

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false
      }
    })
  : null;

export async function getUnreadMessageCount(studentId: string) {
  if (!supabase) return 0;

  const { count, error } = await supabase
    .from("student_messages")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", studentId)
    .is("read_at", null)
    .is("deleted_at", null);

  if (error) return 0;
  return count ?? 0;
}

export function getWebRoute(path: string) {
  return `${academyWebUrl}${path.startsWith("/") ? path : `/${path}`}`;
}
