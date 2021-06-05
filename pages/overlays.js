import { useEffect, useState } from "react";
import { ToastProvider } from "@trycourier/react-toast";
import { CourierTransport } from "@trycourier/react-provider";
import Pusher from "pusher-js";

export default function Home() {
  const [reward, setReward] = useState({});
  let courierTransport;
  if (typeof window !== "undefined") {
    courierTransport = new CourierTransport({
      //You got this from the Courier Integrations page
      clientKey: "YzI4MWYyYzgtMjAxNi00M2EyLTgyZTEtZjhhM2JmNTZhOTdh"
    });

    courierTransport.intercept((message) => {
      // Make sound happen
      console.log(message.data);
      return message;
    });
  }

  Pusher.logToConsole = true;
  const pusher = new Pusher("20520b82edbfca3c0603", {
    cluster: "us2"
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
    <ToastProvider transport={courierTransport}>
      <div>
        <h1>
          {reward.event &&
            `${reward.event.user_name}: ${reward.event.reward.title}`}
        </h1>
      </div>
    </ToastProvider>
  );
}
