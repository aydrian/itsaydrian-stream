use lamedh_http::{
    http::StatusCode,
    lambda::{lambda, Context, Error},
    IntoResponse, Request, Response,
};
// use reqwest;
// use serde_json::json;
use twitch_api2::eventsub::Payload;
// use twitch_api2::helix::HelixClient;
/* use twitch_oauth2::{
    client::reqwest_http_client, tokens::errors::TokenError, AppAccessToken, ClientId, ClientSecret,
};*/

#[lambda(http)]
#[tokio::main]
async fn main(request: Request, _: Context) -> Result<impl IntoResponse, Error> {
    // Convert to http::Request<Vec<u8>> to make twitch_api2 happy. Thanks @christopherbiscardi
    let request = request.map(|body| body.as_ref().into());
    let signing_secret =
        std::env::var("TWITCH_SIGNING_SECRET").expect("TWITCH_CLIENT_ID was not set");

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
        /*Payload::ChannelFollowV1(event) => {}
        Payload::ChannelSubscribeV1(event) => {}
        Payload::ChannelPointsCustomRewardRedemptionAddV1(event) => {}*/
        _ => {}
    };

    Ok(Response::builder()
        .status(StatusCode::OK)
        .body(String::from("OK"))
        .unwrap())
}
