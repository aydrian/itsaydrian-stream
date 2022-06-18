import { pusher } from "~/utils/pusher.server";
import { twitch } from "~/utils/twitch.server";
import type { EventSubEvent } from "~/utils/twitch.server";

export const sendAlert = async (type: string, event: EventSubEvent) => {
  // TODO look up user info if subscribe or follow. Send better payload.
  const viewer = await twitch.users.getUserById(event.user_id);

  await pusher.trigger("itsaydrian-stream", "alerts", {
    type,
    event,
    viewer: {
      id: viewer?.id,
      name: viewer?.name,
      displayName: viewer?.displayName,
      profilePictureUrl: viewer?.profilePictureUrl
    }
  });
};

export const sendReward = async (type: string, event: EventSubEvent) => {
  // TODO look up user info if subscribe or follow. Send better payload.
  const viewer = await twitch.users.getUserById(event.user_id);

  await pusher.trigger("itsaydrian-stream", "redeem-channelpoints", {
    type,
    event,
    viewer: {
      id: viewer?.id,
      name: viewer?.name,
      displayName: viewer?.displayName,
      profilePictureUrl: viewer?.profilePictureUrl
    }
  });
};
