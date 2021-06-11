import { useEffect, useState } from "react";
import { CourierProvider, CourierTransport } from "@trycourier/react-provider";
import { Toast } from "@trycourier/react-toast";
import Pusher from "pusher-js";

const REWARD_BOOP_ATTICUS = "644b10b6-92ac-4f59-8baa-21c3b3cae5cb";

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
      console.log("event data: ", data);
      if (data.event?.reward?.id === REWARD_BOOP_ATTICUS) {
        setReward(data);
        setTimeout(() => {
          setReward({});
        }, 10000);
      }
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
        {reward.event && (
          <div
            style={{
              position: "absolute",
              top: "450px",
              left: "25px",
              textAlign: "center"
            }}
          >
            <img src="atticus.gif" width="200px" />
            <p style={{ fontWeight: "bold", textAlign: "center" }}>
              {reward.event?.user_name} booped Atticus!
            </p>
          </div>
        )}
      </div>
    </CourierProvider>
  );
}

/**
 {
    "broadcaster_user_id": "114823831",
    "broadcaster_user_login": "itsaydrian",
    "broadcaster_user_name": "ItsAydrian",
    "id": "c9f02628-4a20-47ee-875d-46c41e7fff0e",
    "user_id": "114823831",
    "user_login": "itsaydrian",
    "user_name": "ItsAydrian",
    "user_input": "",
    "status": "unfulfilled",
    "redeemed_at": "2021-06-11T22:43:39.846939991Z",
    "reward": {
        "id": "644b10b6-92ac-4f59-8baa-21c3b3cae5cb",
        "title": "Boop Atticus",
        "prompt": "Give Atticus the boops",
        "cost": 100
    }
}
 */
