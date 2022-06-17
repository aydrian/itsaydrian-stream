import type { ActionFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { withVerifyTwitch } from "~/utils/twitch.server";

export const action: ActionFunction = withVerifyTwitch(async ({ request }) => {
  if (request.method !== "POST") {
    return json(
      { message: "Method not allowed" },
      { status: 405, headers: { Allow: "POST" } }
    );
  }
  //const payload = await request.json();
  return json({ success: true }, 200);
});
