import { getCloudflareContext } from "@opennextjs/cloudflare";
import { checkPassword, makeToken } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/login  { password }  ->  { token }
export async function POST(request: Request) {
  const { env } = getCloudflareContext();

  let password = "";
  try {
    const body = (await request.json()) as { password?: string };
    password = body?.password ?? "";
  } catch {
    // no/invalid JSON body -> treated as empty password
  }

  if (!(await checkPassword(env, password))) {
    return Response.json({ error: "wrong password" }, { status: 401 });
  }

  const token = await makeToken(env);
  return Response.json({ token });
}
