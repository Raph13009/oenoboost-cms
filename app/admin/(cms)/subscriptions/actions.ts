"use server";

import { getSupabaseAdmin } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export type Subscription = {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  plan: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SubscriptionWithUser = Subscription & {
  user?: { first_name: string | null; last_name: string | null; email: string } | null;
};

export async function getSubscriptions(options?: {
  page?: number;
  pageSize?: number;
  search?: string;
  plan?: string;
  status?: string;
  sortBy?: "created_at";
  order?: "asc" | "desc";
}): Promise<{ subscriptions: SubscriptionWithUser[]; total: number }> {
  const supabase = getSupabaseAdmin();
  const page = options?.page ?? 1;
  const pageSize = Math.min(Math.max(options?.pageSize ?? 25, 1), 100);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let userIds: string[] | null = null;
  if (options?.search?.trim()) {
    const q = options.search.trim().replace(/'/g, "''").toLowerCase();
    const { data: users } = await supabase
      .from("users")
      .select("id")
      .or(`email.ilike.%${q}%`);
    userIds = (users ?? []).map((u) => u.id);
  }

  let query = supabase
    .from("subscriptions")
    .select(
      "id, user_id, stripe_customer_id, stripe_subscription_id, stripe_price_id, plan, status, current_period_start, current_period_end, canceled_at, created_at, updated_at",
      { count: "exact" }
    );

  if (options?.search?.trim()) {
    const q = options.search.trim().replace(/'/g, "''").toLowerCase();
    if (userIds?.length) {
      const idList = userIds.map((id) => `"${id}"`).join(",");
      query = query.or(`user_id.in.(${idList}),stripe_customer_id.ilike.%${q}%`);
    } else {
      query = query.ilike("stripe_customer_id", `%${q}%`);
    }
  }
  if (options?.plan && options.plan !== "all") {
    query = query.eq("plan", options.plan);
  }
  if (options?.status && options.status !== "all") {
    query = query.eq("status", options.status);
  }

  const sortBy = options?.sortBy ?? "created_at";
  const order = options?.order ?? "desc";
  query = query.order(sortBy, { ascending: order === "asc" });

  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Subscription[];
  const total = count ?? 0;

  if (rows.length === 0) {
    return { subscriptions: [], total };
  }

  const userIdsToFetch = Array.from(new Set(rows.map((r) => r.user_id)));
  const { data: usersData } = await supabase
    .from("users")
    .select("id, first_name, last_name, email")
    .in("id", userIdsToFetch);

  const userMap = new Map(
    (usersData ?? []).map((u: { id: string; first_name: string | null; last_name: string | null; email: string }) => [
      u.id,
      { first_name: u.first_name, last_name: u.last_name, email: u.email },
    ])
  );

  const subscriptions: SubscriptionWithUser[] = rows.map((r) => ({
    ...r,
    user: userMap.get(r.user_id) ?? null,
  }));

  return { subscriptions, total };
}

export async function getSubscription(id: string): Promise<SubscriptionWithUser | null> {
  const supabase = getSupabaseAdmin();
  const { data: sub, error } = await supabase
    .from("subscriptions")
    .select(
      "id, user_id, stripe_customer_id, stripe_subscription_id, stripe_price_id, plan, status, current_period_start, current_period_end, canceled_at, created_at, updated_at"
    )
    .eq("id", id)
    .single();
  if (error || !sub) return null;

  const { data: user } = await supabase
    .from("users")
    .select("id, first_name, last_name, email")
    .eq("id", (sub as Subscription).user_id)
    .single();

  return {
    ...(sub as Subscription),
    user: user
      ? { first_name: user.first_name, last_name: user.last_name, email: user.email }
      : null,
  };
}

/** Sync subscription status from Stripe (placeholder: implement Stripe API call when ready). */
export async function refreshSubscriptionStatus(id: string): Promise<{ error?: string }> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from("subscriptions").select("stripe_subscription_id").eq("id", id).single();
  if (!data?.stripe_subscription_id) return { error: "Subscription or Stripe ID missing" };
  // TODO: call Stripe API to get current status, then update subscriptions row
  revalidatePath("/admin/subscriptions");
  return {};
}

/** Cancel subscription (placeholder: implement Stripe cancel when ready). */
export async function cancelSubscription(id: string): Promise<{ error?: string }> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from("subscriptions").select("stripe_subscription_id").eq("id", id).single();
  if (!data?.stripe_subscription_id) return { error: "Subscription or Stripe ID missing" };
  // TODO: call Stripe API to cancel, then set status/canceled_at in DB
  revalidatePath("/admin/subscriptions");
  return {};
}
