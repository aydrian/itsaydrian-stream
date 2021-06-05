import { useEffect, useState } from "react";
import { CourierProvider, CourierTransport } from "@trycourier/react-provider";
import { Toast } from "@trycourier/react-toast";
import Pusher from "pusher-js";

export default function Overlays() {
  const [reward, setReward] = useState({});
  let courierTransport;
  if (typeof window !== "undefined") {
    courierTransport = new CourierTransport({
      clientKey: process.env.NEXT_PUBLIC_COURIER_CLIENT_KEY
    });
  }

  Pusher.logToConsole = true;
  const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER
  });

  useEffect(() => {
    courierTransport.subscribe(
      "ITSAYDRIAN_STREAM_OVERLAY",
      "TWITCH_ITSAYDRIAN_ALERT"
    );
    // It is good practice to unsubscribe on component unmount

    const channel = pusher.subscribe("itsaydrian-stream");
    channel.bind("redeem-channelpoints", function (data) {
      //alert(JSON.stringify(data));
      setReward(data);
    });
    return () => {
      courierTransport.unsubscribe(
        "ITSAYDRIAN_STREAM_OVERLAY",
        "TWITCH_ITSAYDRIAN_ALERT"
      );
      channel.unbind("redeem-channelpoints");
    };
  }, []);
  return (
    <CourierProvider transport={courierTransport}>
      <Toast />
      <div>
        <h1>
          {reward.event &&
            `${reward.event.user_name}: ${reward.event.reward.title}`}
        </h1>
      </div>
    </CourierProvider>
  );
}
