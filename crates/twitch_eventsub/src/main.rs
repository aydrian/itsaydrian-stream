use lamedh_http::{
    http::StatusCode,
    lambda::{lambda, Context, Error},
    IntoResponse, Request, Response,
};
use pusher::PusherBuilder;
use reqwest;
use serde_json::json;
use twitch_api2::eventsub::{self, Payload};
use twitch_api2::helix::HelixClient;
use twitch_oauth2::{
    client::reqwest_http_client, tokens::errors::TokenError, AppAccessToken, ClientId, ClientSecret,
};

#[lambda(http)]
#[tokio::main]
async fn main(request: Request, _: Context) -> Result<impl IntoResponse, Error> {
    // Convert to http::Request<Vec<u8>> to make twitch_api2 happy. Thanks @christopherbiscardi
    let request = request.map(|body| body.as_ref().into());
    let signing_secret =
        std::env::var("TWITCH_SIGNING_SECRET").expect("TWITCH_SIGNING_SECRET was not set");

    if !Payload::verify_payload(&request, &signing_secret.as_bytes()) {
        return Ok(Response::builder()
            .status(StatusCode::UNPROCESSABLE_ENTITY)
            .body(String::from("Signature verification failed."))
            .unwrap());
    }

    match Payload::parse_http(&request).unwrap() {
        Payload::VerificationRequest(event) => {
            return Ok(Response::builder()
                .status(StatusCode::OK)
                .body(event.challenge)
                .unwrap());
        }
        Payload::ChannelFollowV1(event) => send_follow_alert(event).await.unwrap(),
        Payload::ChannelSubscribeV1(event) => send_subscribe_alert(event).await.unwrap(),
        Payload::ChannelPointsCustomRewardRedemptionAddV1(event) => {
            send_reward_alert(event).await.unwrap()
        }
        _ => {}
    };

    Ok(Response::builder()
        .status(StatusCode::OK)
        .body(String::from("OK"))
        .unwrap())
}

async fn send_follow_alert(
    notif_payload: eventsub::NotificationPayload<eventsub::channel::ChannelFollowV1>,
) -> Result<(), Box<dyn std::error::Error>> {
    let viewer = get_user_from_id(notif_payload.event.user_id.to_string())
        .await?
        .unwrap();
    push(
        String::from("itsaydrian-stream"),
        String::from("alerts"),
        json!({
            "type": "channel.follow",
            "event": notif_payload.event,
            "viewer": {
                "id": viewer.id,
                "name": viewer.display_name,
                "displayName": viewer.display_name,
                "profilePictureUrl": viewer.profile_image_url
            }
        }),
    )
    .await?;
    Ok(())
}

async fn send_subscribe_alert(
    notif_payload: eventsub::NotificationPayload<eventsub::channel::ChannelSubscribeV1>,
) -> Result<(), Box<dyn std::error::Error>> {
    let viewer = get_user_from_id(notif_payload.event.user_id.to_string())
        .await?
        .unwrap();
    push(
        String::from("itsaydrian-stream"),
        String::from("alerts"),
        json!({
            "type": "channel.subscribe",
            "event": notif_payload.event,
            "viewer": {
                "id": viewer.id,
                "name": viewer.display_name,
                "displayName": viewer.display_name,
                "profilePictureUrl": viewer.profile_image_url
            }
        }),
    )
    .await?;
    Ok(())
}

async fn send_reward_alert(
    notif_payload: eventsub::NotificationPayload<
        eventsub::channel::ChannelPointsCustomRewardRedemptionAddV1,
    >,
) -> Result<(), Box<dyn std::error::Error>> {
    let viewer = get_user_from_id(notif_payload.event.user_id.to_string())
        .await?
        .unwrap();
    push(
        String::from("itsaydrian-stream"),
        String::from("alerts"),
        json!({
            "type": "channel.channel_points_custom_reward_redemption.add",
            "event": notif_payload.event,
            "viewer": {
                "id": viewer.id,
                "name": viewer.display_name,
                "displayName": viewer.display_name,
                "profilePictureUrl": viewer.profile_image_url
            }
        }),
    )
    .await?;
    Ok(())
}

async fn push(
    channel: String,
    event: String,
    payload: serde_json::Value,
) -> Result<(), Box<dyn std::error::Error>> {
    let app_id = std::env::var("PUSHER_APP_ID").expect("PUSHER_APP_ID was not set");
    let key = std::env::var("NEXT_PUBLIC_PUSHER_KEY").expect("NEXT_PUBLIC_PUSHER_KEY was not set");
    let secret = std::env::var("PUSHER_SECRET").expect("PUSHER_SECRET was not set");
    let cluster = std::env::var("NEXT_PUBLIC_PUSHER_CLUSTER")
        .expect("NEXT_PUBLIC_PUSHER_CLUSTER was not set");
    let pusher = PusherBuilder::new(&app_id, &key, &secret)
        .host(format!("https://api-{}.pusher.com ", cluster))
        .finalize();

    pusher.trigger(&channel, &event, payload).await?;
    Ok(())
}

async fn get_user_from_id(
    user_id: String,
) -> Result<Option<twitch_api2::helix::users::User>, Box<dyn std::error::Error>> {
    let client_id = match std::env::var("TWITCH_CLIENT_ID") {
        Ok(val) => ClientId::new(val),
        Err(_e) => panic!("TWITCH_CLIENT_ID was not set"),
    };

    let client_secret = match std::env::var("TWITCH_CLIENT_SECRET") {
        Ok(val) => ClientSecret::new(val),
        Err(_e) => panic!("TWITCH_CLIENT_SECRET was not set"),
    };

    let token = match AppAccessToken::get_app_access_token(
        reqwest_http_client,
        client_id,
        client_secret,
        vec![],
    )
    .await
    {
        Ok(t) => t,
        Err(TokenError::Request(e)) => panic!("got error: {:?}", e),
        Err(e) => panic!("{:?}", e),
    };

    let helix: HelixClient<'static, reqwest::Client> = HelixClient::default();

    Ok(helix.get_user_from_id(user_id, &token).await?)
}
