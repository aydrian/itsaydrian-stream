import rehype from "rehype";
import sanitize from "rehype-sanitize";

import { useChatMessages } from "@context/chat";

import styles from "./Chat.module.css";

function getUsernameColor(roles) {
  if (roles.includes("BROADCASTER")) {
    return "var(--yellow)";
  }

  if (roles.includes("MODERATOR")) {
    return "var(--pink-text)";
  }

  if (roles.includes("SUBSCRIBER")) {
    return "var(--blue)";
  }

  return "var(--text)";
}

function getChannelIcon(channel) {
  if (channel === "itsaydrian") {
    return "💚 ";
  }

  if (channel === "larenaiocco") {
    return "💜 ";
  }

  if (channel === "chloecondon") {
    return "🧡 ";
  }

  return "";
}

export function Chat() {
  const messages = useChatMessages();
  return (
    <div className={styles.chat}>
      <ul className={styles["chat-container"]}>
        {messages.map((message) => {
          if (!message.html) {
            return;
          }

          const text = rehype()
            .data("settings", { fragment: true })
            .use(sanitize, {
              strip: ["script"],
              protocols: {
                src: ["https"]
              },
              tagNames: ["img", "marquee"],
              attributes: {
                img: ["src"],
                "*": ["alt"]
              }
            })
            .processSync(message.html)
            .toString();

          if (!text.length) {
            return;
          }

          return (
            <li
              key={`${message.time}:${message.author.username}`}
              className={styles["chat-message"]}
            >
              <strong style={{ color: getUsernameColor(message.author.roles) }}>
                {message.author.username}:
              </strong>{" "}
              <span dangerouslySetInnerHTML={{ __html: text }} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
