// Simple Supabase reset script using service role token
// Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE=... npm run reset:data

const SUPABASE_URL = process.env.SUPABASE_URL || "https://oajnvirtgkpfdnxosgpu.supabase.co";
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

if (!SERVICE_ROLE) {
  console.error("Missing SUPABASE_SERVICE_ROLE environment variable");
  process.exit(1);
}

const headers = {
  "Content-Type": "application/json",
  apikey: SERVICE_ROLE,
  Authorization: `Bearer ${SERVICE_ROLE}`,
};

async function reset() {
  try {
    // Delete all join_requests
    let res = await fetch(`${SUPABASE_URL}/rest/v1/join_requests`, {
      method: "DELETE",
      headers,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed DELETE join_requests: ${res.status} ${text}`);
    }

    // Reset groups
    res = await fetch(`${SUPABASE_URL}/rest/v1/groups`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ total_members: 0, status: "open" }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed PATCH groups: ${res.status} ${text}`);
    }

    console.log("Reset complete: cleared join_requests and reset groups");
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}

reset();
