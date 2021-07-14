import { pusher } from "./pusher";
import { twitch } from "./twitch";

export const sendAlert = async (type, event) => {
  // TODO look up user info if subscribe or follow. Send better payload.
  const viewer = await twitch.helix.users.getUserById(event.user_id);

  await pusher.trigger("itsaydrian-stream", "alerts", {
    type,
    event,
    viewer: {
      id: viewer.id,
      name: viewer.name,
      displayName: viewer.displayName,
      profilePictureUrl: viewer.profilePictureUrl
    }
  });
};

export const sendReward = async (type, event) => {
  // TODO look up user info if subscribe or follow. Send better payload.
  const viewer = await twitch.helix.users.getUserById(event.user_id);

  await pusher.trigger("itsaydrian-stream", "redeem-channelpoints", {
    type,
    event,
    viewer: {
      id: viewer.id,
      name: viewer.name,
      displayName: viewer.displayName,
      profilePictureUrl: viewer.profilePictureUrl
    }
  });
};
