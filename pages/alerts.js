import { useEffect } from "react";
import Pusher from "pusher-js";
import { ToastContainer, toast, Flip } from "react-toastify";
import { Box, Flex, Image, Text } from "@chakra-ui/react";

const getMessage = (event) => {
  if (event.type === "channel.follow") {
    return `${event.viewer.displayName} just followed!`;
  } else if (event.type === "channel.subscribe") {
    return `${event.viewer.displayName} just subscribed!`;
  } else if (event.type === "channel.raid") {
    return `${event.viewer.displayName} is raiding with ${event.viewers} viewers! 🎉`;
  }
};

const getSound = (event) => {
  if (event.type === "channel.follow") {
    return `/sfx/follow_alert.mp3`;
  } else if (event.type === "channel.subscribe") {
    return `/sfx/subscribe_alert.mp3`;
  }
};

const Alert = ({ event }) => (
  <div>
    <audio autoPlay>
      <source src={getSound(event)} type="audio/mp3" />
    </audio>
    <Flex>
      <Box>
        <Image
          alt={event.viewer.displayName}
          borderRadius="md"
          boxSize="60px"
          src={event.viewer.profilePictureUrl}
        />
      </Box>
      <Box flex="1" p="3">
        <Text fontSize="lg" color="darkgreen">
          {getMessage(event)}
        </Text>
      </Box>
    </Flex>
  </div>
);

export default function Alerts() {
  const notify = (event) => {
    toast(<Alert event={event} />);
  };

  useEffect(() => {
    // Pusher.logToConsole = true;
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER
    });

    const channel = pusher.subscribe("itsaydrian-stream");
    channel.bind("alerts", function (alert) {
      console.log("alert data: ", alert);
      notify(alert);
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
    };
  }, []);

  return (
    <div>
      <ToastContainer
        closeButton={false}
        position="top-center"
        transition={Flip}
      />
    </div>
  );
}
