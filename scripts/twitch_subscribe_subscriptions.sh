#!/bin/sh
twitch token -u -s channel:read:subscriptions
TWITCH_SIGNING_SECRET=$(ntl env:get TWITCH_SIGNING_SECRET)
twitch api post eventsub/subscriptions -b '{
  "type": "channel.subscribe",
  "version": "1",
  "condition": {
      "broadcaster_user_id": "114823831"
  },
  "transport": {
      "method": "webhook",
      "callback": "https://itsaydrian-stream.netlify.app/webhooks/twitch",
      "secret": "$TWITCH_SIGNING_SECRET"
  }
}'