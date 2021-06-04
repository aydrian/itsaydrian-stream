import { useEffect } from "react";
import { ToastProvider } from "@trycourier/react-toast";
import { CourierTransport } from "@trycourier/react-provider";

export default function Home() {
  let courierTransport;
  if (typeof window !== "undefined") {
    courierTransport = new CourierTransport({
      //You got this from the Courier Integrations page
      clientKey: "YzI4MWYyYzgtMjAxNi00M2EyLTgyZTEtZjhhM2JmNTZhOTdh"
    });

    courierTransport.intercept((message) => {
      // Make sound happen
      const audio = new Audio("/t-rex-roar.mp3");
      audio.play();
      console.log(message);
      return message;
    });
  }

  useEffect(() => {
    courierTransport.subscribe(
      "ITSAYDRIAN_STREAM_OVERLAY",
      "TWITCH_ITSAYDRIAN_FOLLOWER"
    );
    // It is good practice to unsubscribe on component unmount
    return () =>
      courierTransport.unsubscribe(
        "ITSAYDRIAN_STREAM_OVERLAY",
        "TWITCH_ITSAYDRIAN_FOLLOWER"
      );
  }, []);
  return (
    <ToastProvider transport={courierTransport}>
      <div></div>
    </ToastProvider>
  );
}
