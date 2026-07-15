import { redirect } from "next/navigation";
import { StudentDirectoryClient } from "@/components/student-directory-client";
import { isAffAdminUser } from "@/lib/admin-server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function StudentDirectoryPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/student-directory");
  }

  const isAdmin = await isAffAdminUser(user.id);
  if (!isAdmin) {
    redirect("/access-denied?from=student-directory");
  }

  return <StudentDirectoryClient />;
}
