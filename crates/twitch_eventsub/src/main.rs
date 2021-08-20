use lamedh_http::{
    http::StatusCode,
    lambda::{lambda, Context, Error},
    IntoResponse, Request, Response,
};
use pusher::PusherBuilder;
use reqwest;
use serde_json::json;
use twitch_api2::helix::{ClientRequestError, HelixClient};
use twitch_api2::{
    eventsub::{self, EventSubscription, Payload},
    types::UserId,
};
use twitch_oauth2::{client::reqwest_http_client, AppAccessToken, ClientId, ClientSecret};

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
        Payload::ChannelFollowV1(event) => send_alert::<eventsub::channel::ChannelFollowV1>(
            "alerts",
            "channel.follow",
            &event.event.user_id,
            &event.event,
        )
        .await
        .unwrap(),
        Payload::ChannelSubscribeV1(event) => send_alert::<eventsub::channel::ChannelSubscribeV1>(
            "alerts",
            "channel.subscribe",
            &event.event.user_id,
            &event.event,
        )
        .await
        .unwrap(),
        Payload::ChannelPointsCustomRewardRedemptionAddV1(event) => {
            send_alert::<eventsub::channel::ChannelPointsCustomRewardRedemptionAddV1>(
                "redeem-channelpoints",
                "channel.channel_points_custom_reward_redemption.add",
                &event.event.user_id,
                &event.event,
            )
            .await
            .unwrap()
        }
        _ => {}
    };

    Ok(Response::builder()
        .status(StatusCode::OK)
        .body(String::from("OK"))
        .unwrap())
}

async fn send_alert<T: EventSubscription>(
    topic: &str,
    event_type: &str,
    user_id: &UserId,
    event: &T::Payload,
) -> Result<(), Box<dyn std::error::Error>> {
    let viewer = get_user_from_id(user_id).await?.unwrap();
    push(
        String::from("itsaydrian-stream"),
        topic.to_string(),
        json!({
            "type": event_type,
            "event": event,
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
    // Need to use from_url to get around lack of cluster support for Pusher Channels
    let pusher = PusherBuilder::from_url(&format!(
        "http://{}:{}@api-{}.pusher.com/apps/{}",
        key, secret, cluster, app_id
    ))
    .finalize();

    pusher.trigger(&channel, &event, payload).await?;
    Ok(())
}

async fn get_user_from_id(
    user_id: &UserId,
) -> Result<Option<twitch_api2::helix::users::User>, ClientRequestError<reqwest::Error>> {
    let client_id = std::env::var("TWITCH_CLIENT_ID")
        .map(|val| ClientId::new(val))
        .expect("TWITCH_CLIENT_ID was not set");

    let client_secret = std::env::var("TWITCH_CLIENT_SECRET")
        .map(|val| ClientSecret::new(val))
        .expect("TWITCH_CLIENT_SECRET was not set");

    let token =
        AppAccessToken::get_app_access_token(reqwest_http_client, client_id, client_secret, vec![])
            .await
            .unwrap();

    let helix: HelixClient<'static, reqwest::Client> = HelixClient::default();

    helix.get_user_from_id(user_id.clone(), &token).await
}
