import { useEffect } from "react";
import { rehype } from "rehype";
import sanitize from "rehype-sanitize";
import { toast } from "react-toastify";
import { Box, Flex, Image, Text } from "@chakra-ui/react";

import { useChatMessages } from "@context/chat";

function getUsernameColor(roles) {
  if (roles.includes("BROADCASTER")) {
    return "var(--green)";
  }

  if (roles.includes("MODERATOR")) {
    return "var(--pink-text)";
  }

  if (roles.includes("SUBSCRIBER")) {
    return "var(--blue)";
  }

  return "var(--black)";
}

function ChatMessage({ message }) {
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
    <Flex>
      <Box>
        <Image
          alt={message.author.username}
          borderRadius="md"
          boxSize="60px"
          src={message.author.profileImageUrl}
        />
      </Box>
      <Box flex="1" p="3">
        <Text fontSize="md" className="chat-message">
          <strong style={{ color: getUsernameColor(message.author.roles) }}>
            {message.author.username}
          </strong>
          <br />
          <span dangerouslySetInnerHTML={{ __html: text }} />
        </Text>
      </Box>
    </Flex>
  );
}

export function Chat() {
  const messages = useChatMessages();

  useEffect(() => {
    const [message] = messages.slice(-1);
    if (!message) return;
    console.log(message);

    toast(<ChatMessage message={message} />);
  }, [messages.length]);

  return <div />;
}
