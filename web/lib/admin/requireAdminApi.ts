import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type AdminApiProfile = {
  id: string;
  role: "user" | "gallerist" | "admin";
  plan: "free" | "pro" | "business" | "diamond" | "institution";
};

export async function requireAdminApi() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false as const,
      status: 401,
      error: "Unauthorized",
      user: null,
      profile: null,
      admin: null,
    };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role, plan")
    .eq("id", user.id)
    .single<AdminApiProfile>();

  if (error || !profile) {
    return {
      ok: false as const,
      status: 403,
      error: "Profilo non trovato.",
      user,
      profile: null,
      admin: null,
    };
  }

  if (profile.role !== "admin") {
    return {
      ok: false as const,
      status: 403,
      error: "Accesso negato.",
      user,
      profile,
      admin: null,
    };
  }

  const admin = createAdminClient();

  return {
    ok: true as const,
    status: 200,
    error: null,
    user,
    profile,
    admin,
  };
}