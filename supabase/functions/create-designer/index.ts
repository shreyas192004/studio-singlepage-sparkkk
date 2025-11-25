import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  designer: z.object({
    name: z.string(),
    bio: z.string().optional(),
    avatar_url: z.string().optional(),
    social_links: z
      .object({
        instagram: z.string().optional(),
        twitter: z.string().optional(),
        website: z.string().optional(),
      })
      .optional(),
    featured: z.boolean().optional(),
    men_only: z.boolean().optional(),
    women_only: z.boolean().optional(),
  }),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return new Response(
        JSON.stringify({ error: "Missing server config" }),
        { status: 500, headers: corsHeaders }
      );
    }

    const json = await req.json();
    const parsed = bodySchema.safeParse(json);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid payload", details: parsed.error }),
        { status: 400, headers: corsHeaders }
      );
    }

    const { email, password, designer } = parsed.data;

    // 1) Create auth user (Admin)
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE}`,
        apikey: SERVICE_ROLE,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (!userRes.ok) {
      return new Response(
        JSON.stringify({ error: "Failed creating user" }),
        { status: 500, headers: corsHeaders }
      );
    }

    const user = await userRes.json();
    const userId = user.id;

    // 2) Insert into designers table
    const designerRes = await fetch(`${SUPABASE_URL}/rest/v1/designers`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE}`,
        apikey: SERVICE_ROLE,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        ...designer,
        user_id: userId,
        created_at: new Date().toISOString(),
      }),
    });

    if (!designerRes.ok) {
      return new Response(
        JSON.stringify({ error: "Failed inserting designer" }),
        { status: 500, headers: corsHeaders }
      );
    }

    const newDesigner = await designerRes.json();

    return new Response(
      JSON.stringify({ user, designer: newDesigner }),
      { status: 200, headers: corsHeaders }
    );

  } catch (e) {
    const error = e as Error;
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
