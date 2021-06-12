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
    console.log("Creating the chat client.", channels);
    const _client = new tmi.Client({
      connection: {
        secure: true,
        reconnect: true
      },
      channels,
      identity
    });
    console.log(_client);
    console.log("Turning on the chat client");
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

  useEffect(() => {
    /** Return early if there's no client */
    if (!client) return;

    client.on("message", async (channel, tags, msg, self) => {
      // don’t process messages sent by the chatbot to avoid loops
      if (self) return;

      if (tags["message-type"] === "whisper") {
        // we don’t handle whispers
        return;
      }

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
    });
  }, [client]);

  return messages;
}
