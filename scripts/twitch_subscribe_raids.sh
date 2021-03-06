#!/bin/sh
TWITCH_SIGNING_SECRET=$(ntl env:get TWITCH_SIGNING_SECRET)
twitch api post eventsub/subscriptions -b '{
  "type": "channel.raid",
  "version": "1",
  "condition": {
      "to_broadcaster_user_id": "114823831"
  },
  "transport": {
      "method": "webhook",
      "callback": "https://itsaydrian-stream.netlify.app/webhooks/twitch",
      "secret": "$TWITCH_SIGNING_SECRET"
  }
}'