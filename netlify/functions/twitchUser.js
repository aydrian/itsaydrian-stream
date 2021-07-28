import { twitch } from "../lib/twitch";

export async function handler(event) {
  const { userId } = event.queryStringParameters;

  const user = await twitch.helix.users.getUserById(userId);

  return {
    statusCode: 200,
    body: JSON.stringify({
      id: user.id,
      name: user.name,
      displayName: user.displayName,
      description: user.description,
      profilePictureUrl: user.profilePictureUrl
    })
  };
}
