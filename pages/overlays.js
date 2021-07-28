import { useEffect, useState } from "react";
import Pusher from "pusher-js";
import { ChatProvider } from "@context/chat";
import { EmoteDrop } from "@components/EmoteDrop";

const REWARD_BOOP_ATTICUS = "644b10b6-92ac-4f59-8baa-21c3b3cae5cb";

function AtticusBoop({ event }) {
  return (
    <div
      style={{
        position: "absolute",
        top: "450px",
        left: "25px",
        textAlign: "center"
      }}
    >
      <audio autoPlay>
        <source src="/t-rex-roar.mp3" type="audio/mp3" />
      </audio>
      <img src="atticus.gif" width="200px" />
      <p style={{ fontWeight: "bold", textAlign: "center" }}>
        {event?.user_name} booped Atticus!
      </p>
    </div>
  );
}

export default function Overlays() {
  const [reward, setReward] = useState({});

  useEffect(() => {
    // Pusher.logToConsole = true;
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER
    });

    const channel = pusher.subscribe("itsaydrian-stream");
    channel.bind("redeem-channelpoints", function (data) {
      if (data.event?.reward?.id === REWARD_BOOP_ATTICUS) {
        setReward(data);
        setTimeout(() => {
          setReward({});
        }, 10000);
      }
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
    };
  }, []);
  return (
    <ChatProvider channels={["itsaydrian"]}>
      <EmoteDrop filter={["CorgiDerp", "DoritosChip"]} />
      {reward.event && <AtticusBoop event={reward.event} />}
    </ChatProvider>
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
