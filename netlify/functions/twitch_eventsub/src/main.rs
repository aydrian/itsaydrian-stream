use aws_lambda_events::encodings::Body;
use aws_lambda_events::event::apigw::{ApiGatewayProxyRequest, ApiGatewayProxyResponse};
use hmac::{Hmac, Mac};
use http::header::{HeaderMap, CONTENT_TYPE};
use lambda_runtime::{handler_fn, Context, Error};
use pusher::PusherBuilder;
use reqwest;
use serde_json::json;
use sha2::Sha256;
use twitch_api2::helix::{ClientRequestError, HelixClient};
use twitch_api2::{
    eventsub::{self, EventSubscription, Payload},
    types::UserId,
};
use twitch_oauth2::{AppAccessToken, ClientId, ClientSecret};

// Create alias for HMAC-SHA256
type HmacSha256 = Hmac<Sha256>;

#[tokio::main]
async fn main() -> Result<(), Error> {
    let handler_fn = handler_fn(handler);
    lambda_runtime::run(handler_fn).await?;
    Ok(())
}

async fn handler(
    event: ApiGatewayProxyRequest,
    _: Context,
) -> Result<ApiGatewayProxyResponse, Error> {
    let signing_secret =
        std::env::var("TWITCH_SIGNING_SECRET").expect("TWITCH_SIGNING_SECRET was not set");

    if !verify_payload(&event, signing_secret.as_bytes()) {
        let mut headers = HeaderMap::new();
        headers.insert(CONTENT_TYPE, "text/plain".parse().unwrap());
        return Ok(ApiGatewayProxyResponse {
            status_code: 422,
            headers,
            multi_value_headers: HeaderMap::new(),
            body: Some(Body::Text(String::from("Signature verification failed."))),
            is_base64_encoded: Some(false),
        });
    }

    match Payload::parse(&event.body.unwrap()).unwrap() {
        Payload::VerificationRequest(event) => {
            let mut headers = HeaderMap::new();
            headers.insert(CONTENT_TYPE, "text/plain".parse().unwrap());
            return Ok(ApiGatewayProxyResponse {
                status_code: 200,
                headers,
                multi_value_headers: HeaderMap::new(),
                body: Some(Body::Text(event.challenge)),
                is_base64_encoded: Some(false),
            });
        }
        Payload::ChannelFollowV1(event) => send_alert::<eventsub::channel::ChannelFollowV1>(
            "alerts",
            &event.event.user_id,
            &event.event,
        )
        .await
        .unwrap(),
        Payload::ChannelSubscribeV1(event) => send_alert::<eventsub::channel::ChannelSubscribeV1>(
            "alerts",
            &event.event.user_id,
            &event.event,
        )
        .await
        .unwrap(),
        Payload::ChannelPointsCustomRewardRedemptionAddV1(event) => {
            send_alert::<eventsub::channel::ChannelPointsCustomRewardRedemptionAddV1>(
                "redeem-channelpoints",
                &event.event.user_id,
                &event.event,
            )
            .await
            .unwrap()
        }
        _ => {}
    };

    Ok(ApiGatewayProxyResponse {
        status_code: 200,
        headers: HeaderMap::new(),
        multi_value_headers: HeaderMap::new(),
        body: Some(Body::Text(String::from("OK"))),
        is_base64_encoded: Some(false),
    })
}

fn verify_payload(event: &ApiGatewayProxyRequest, secret: &[u8]) -> bool {
    let message_id = event
        .headers
        .get("twitch-eventsub-message-id")
        .unwrap()
        .to_str()
        .unwrap();
    let message_timestamp = event
        .headers
        .get("twitch-eventsub-message-timestamp")
        .unwrap()
        .to_str()
        .unwrap();
    let message_signature = event
        .headers
        .get("twitch-eventsub-message-signature")
        .unwrap()
        .to_str()
        .unwrap();
    // dbg!(message_signature);
    let body = event.body.clone().unwrap();
    let input = format!("{}{}{}", message_id, message_timestamp, body);

    let mut hmac = HmacSha256::new_from_slice(secret).expect("HMAC can take key of any size");
    hmac.update(input.as_bytes());
    let result = hmac.finalize();
    let expected_signature = format!("sha256={}", hex::encode(result.into_bytes()));
    // dbg!(&expected_signature);

    message_signature == &expected_signature[..]
}

async fn send_alert<T: EventSubscription>(
    topic: &str,
    user_id: &UserId,
    event: &T::Payload,
) -> Result<(), Box<dyn std::error::Error>> {
    let viewer = get_user_from_id(user_id).await?.unwrap();
    push(
        String::from("itsaydrian-stream"),
        topic.to_string(),
        json!({
            "type": T::EVENT_TYPE.to_string(),
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

    let token = AppAccessToken::get_app_access_token(
        &reqwest::Client::new(),
        client_id,
        client_secret,
        vec![],
    )
    .await
    .unwrap();

    let helix: HelixClient<'static, reqwest::Client> = HelixClient::default();

    helix.get_user_from_id(user_id.clone(), &token).await
}
