import withVerifyTwitch from "../lib/withVerifyTwitch";
import { sendFollow, sendOnline } from "../lib/courier";
import Pusher from "pusher";

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
  useTLS: true
});

async function twitchHandler(event, context) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { Allow: "POST" },
      body: "Method Not Allowed"
    };
  }

  const body = JSON.parse(event.body);
  const messageType = event.headers["twitch-eventsub-message-type"];
  if (messageType === "webhook_callback_verification") {
    return {
      statusCode: 200,
      body: body.challenge
    };
  } else if (messageType === "notification") {
    const {
      event,
      subscription: { type }
    } = body;

    console.log(
      `Receiving ${type} request for ${event.broadcaster_user_name}: `,
      event
    );

    try {
      if (type === "stream.online") {
        await sendOnline(event);
      } else if (type === "channel.follow" || type === "channel.subscribe") {
        await sendFollow(type, event);
      } else if (
        type === "channel.channel_points_custom_reward_redemption.add"
      ) {
        await pusher.trigger("itsaydrian-stream", "redeem-channelpoints", {
          type,
          event
        });
      }
    } catch (ex) {
      console.log(
        `An error occurred sending the ${type} notification for ${event.broadcaster_user_name}: `,
        ex
      );
    }
  }

  return {
    statusCode: 200
  };
}

export const handler = withVerifyTwitch(twitchHandler);
