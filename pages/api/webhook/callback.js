const { json } = require("micro");
import withVerifyTwitch from "../../../middleware/withVerifyTwitch";

async function handler(req, res) {
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
    console.log("I'm online!");
  }

  res.status(200).end();
}

export default withVerifyTwitch(handler);

export const config = {
  api: {
    bodyParser: false
  }
};
