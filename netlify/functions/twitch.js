import withVerifyTwitch from "../lib/withVerifyTwitch";
import { sendAlert, sendReward } from "../lib/alerts";

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
        // todo
      } else if (type === "channel.follow" || type === "channel.subscribe") {
        await sendAlert(type, event);
      } else if (
        type === "channel.channel_points_custom_reward_redemption.add"
      ) {
        await sendReward(type, event);
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
