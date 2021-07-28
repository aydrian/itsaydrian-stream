import { createContext, useContext, useEffect, useState } from "react";
import tmi from "tmi.js";
import {
  getMessageHTML,
  parseAuthor,
  parseCommand,
  parseEmotes
} from "@utils/parse-twitch-chat";

const ChatContext = createContext();

export function ChatProvider({ children, channels, identity }) {
  const [client, setClient] = useState();

  useEffect(() => {
    const _client = new tmi.Client({
      connection: {
        secure: true,
        reconnect: true
      },
      channels,
      identity
    });
    _client.connect();
    setClient(_client);

    return () => {
      _client.disconnect();
    };
  }, [channels, identity]);

  return (
    <ChatContext.Provider value={{ client }}>{children}</ChatContext.Provider>
  );
}

export function useChatClient() {
  const { client } = useContext(ChatContext);

  if (client === undefined) {
    throw new Error("useChatClient must be used within ChatProvider");
  }

  return client;
}

export function useChatMessages() {
  const { client } = useContext(ChatContext);
  const [messages, setMessages] = useState([]);
  const profileImages = {
    114823831:
      "https://static-cdn.jtvnw.net/jtv_user_pictures/905046a7-e4d4-4e9d-b337-df8531fb8bfe-profile_image-300x300.png"
  };

  const getProfileImage = async (userId) => {
    if (profileImages[userId]) {
      return profileImages[userId];
    }

    const { profilePictureUrl } = await fetch(
      `http://localhost:8888/.netlify/functions/twitchUser?userId=${userId}`
    ).then((response) => response.json());
    profileImages[userId] = profilePictureUrl;
    return profilePictureUrl;
  };

  useEffect(() => {
    /** Return early if there's no client */
    if (!client) return;

    const listener = async (channel, tags, msg, self) => {
      // don’t process messages sent by the chatbot to avoid loops
      if (self) return;

      if (tags["message-type"] === "whisper") {
        // we don’t handle whispers
        return;
      }

      // Grab profile image once per user
      tags.profileImageUrl = (await getProfileImage(tags["user-id"])) || "";

      // chat activity always includes author and emote data
      const time = new Date(parseInt(tags["tmi-sent-ts"]));

      const message = {
        channel: channel.replace("#", ""),
        message: msg,
        author: parseAuthor(channel, tags),
        emotes: parseEmotes(msg, tags.emotes),
        time,
        id: tags.id
      };

      if (msg.match(/^(!|--)/)) {
        const { command, args } = parseCommand(msg);

        message.command = command;
        message.args = args;
      } else {
        message.html = getMessageHTML(msg, message.emotes);
      }

      return setMessages((prev) => [...prev, message]);
    };

    client.on("message", listener);

    return () => {
      client.removeListener("message", listener);
    };
  }, [client]);

  return messages;
}
