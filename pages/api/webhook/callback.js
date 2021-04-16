const { json } = require("micro");
import { CourierClient } from "@trycourier/courier";
import { ApiClient } from "twitch";
import { ClientCredentialsAuthProvider } from "twitch-auth";
import withVerifyTwitch from "../../../middleware/withVerifyTwitch";

const courier = CourierClient();
const authProvider = new ClientCredentialsAuthProvider(
  process.env.TWITCH_CLIENT_ID,
  process.env.TWITCH_CLIENT_SECRET
);
const twitch = new ApiClient({ authProvider });

const handler = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  const body = await json(req);
  const messageType = req.headers["twitch-eventsub-message-type"];
  if (messageType === "webhook_callback_verification") {
    console.log("Verifying Webhook");
    return res.status(200).send(body.challenge);
  }

  const { type } = body.subscription;
  const { event } = body;

  console.log(
    `Receiving ${type} request for ${event.broadcaster_user_name}: `,
    event
  );

  if (type === "stream.online") {
    try {
      await sendOnline(event);
    } catch (ex) {
      console.log(
        `An error occurred sending the Online notification for ${event.broadcaster_user_name}: `,
        ex
      );
    }
  } else if (type === "channel.follow") {
    try {
      await sendFollow(event);
    } catch (ex) {
      console.log(
        `An error occurred sending the Follow notification for ${event.broadcaster_user_name}: `,
        ex
      );
    }
  }

  res.status(200).end();
};

const sendFollow = async (event) => {
  const { messageId } = await courier.send({
    eventId: "TWITCH_ITSAYDRIAN_FOLLOWER",
    recipientId: "ITSAYDRIAN_STREAM_OVERLAY",
    profile: {
      courier: {
        channel: "ITSAYDRIAN_STREAM_OVERLAY"
      }
    },
    data: event
  });
  console.log(
    `Follow notification for ${event.broadcaster_user_name} sent. Message ID: ${messageId}.`
  );
};

const sendOnline = async (event) => {
  const data = await getStreamData(event.broadcaster_user_id);

  const { messageId } = await courier.lists.send({
    event: "TWITCH_ITSAYDRIAN_ONLINE",
    list: "itsaydrian.stream.online",
    data
  });
  console.log(
    `Online notification for ${event.broadcaster_user_name} sent. Message ID: ${messageId}.`
  );
};

const getStreamData = async (userId) => {
  const stream = await twitch.helix.streams.getStreamByUserId(userId);
  if (!stream) {
    console.log(`No current stream for ${userId}.`);
    return {};
  }
  const broadcaster = await stream.getUser();
  const game = await stream.getGame();

  const data = {
    stream: {
      id: stream.id,
      type: stream.type,
      startDate: stream.startDate,
      title: stream.title,
      tagIds: stream.tagIds,
      thumbnailUrl: stream.thumbnailUrl.replace("-{width}x{height}", ""),
      viewers: stream.viewers
    },
    game: {
      id: game.id,
      name: game.name,
      boxArtUrl: game.boxArtUrl.replace("-{width}x{height}", "")
    },
    broadcaster: {
      id: broadcaster.id,
      type: broadcaster.broadcasterType,
      userType: broadcaster.type,
      name: broadcaster.name,
      displayName: broadcaster.displayName,
      description: broadcaster.description,
      profilePictureUrl: broadcaster.profilePictureUrl,
      views: broadcaster.views
    }
  };
  return data;
};

export const config = {
  api: {
    bodyParser: false
  }
};
export default withVerifyTwitch(handler);
