import crypto from "crypto";
import { buffer } from "micro";
const twitchSigningSecret = process.env.TWITCH_SIGNING_SECRET;

const withVerifyTwitch = (handler) => {
  return async (req, res) => {
    const messageId = req.headers["twitch-eventsub-message-id"];
    const timestamp = req.headers["twitch-eventsub-message-timestamp"];
    const messageSignature = req.headers["twitch-eventsub-message-signature"];
    const time = Math.floor(new Date().getTime() / 1000);

    if (Math.abs(time - timestamp) > 600) {
      // needs to be < 10 minutes
      console.log(
        `Verification Failed: timestamp > 10 minutes. Message Id: ${messageId}.`
      );
      throw new Error("Ignore this request.");
    }

    if (!twitchSigningSecret) {
      console.log(`Twitch signing secret is empty.`);
      res.status(422).send("Signature verification failed.");
    }

    const buf = await buffer(req);
    const computedSignature =
      "sha256=" +
      crypto
        .createHmac("sha256", twitchSigningSecret)
        .update(messageId + timestamp + buf)
        .digest("hex");

    if (messageSignature !== computedSignature) {
      console.log(`Provided signature does not match computed signature.`);
      console.log(`Message ${messageId} Signature: `, messageSignature);
      console.log(
        `Message ${messageId} Computed Signature: ${computedSignature}`
      );
      return res.status(422).send("Signature verification failed.");
    }

    return handler(req, res);
  };
};

export default withVerifyTwitch;
