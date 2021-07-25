use lamedh_http::{
    http::StatusCode,
    lambda::{lambda, Context},
    IntoResponse, Request, RequestExt, Response,
};
use reqwest;
use serde_json::json;
use twitch_api2::helix::HelixClient;
use twitch_oauth2::{
    client::reqwest_http_client, tokens::errors::TokenError, AppAccessToken, ClientId, ClientSecret,
};

type Error = Box<dyn std::error::Error + Send + Sync + 'static>;

#[lambda(http)]
#[tokio::main]
async fn main(request: Request, _: Context) -> Result<impl IntoResponse, Error> {
    // If no query param was provided, return a 400
    let user_id = match request.query_string_parameters().get("user_id") {
        Some(val) => val,
        None => {
            return Ok(Response::builder()
                .status(StatusCode::BAD_REQUEST)
                .body(())
                .unwrap());
        }
    };

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
        Err(e) => panic!(e),
    };

    let helix: HelixClient<'static, reqwest::Client> = HelixClient::default();
    // better error handling rather than unwrap?
    match helix.get_user_from_id(user_id, &token).await.unwrap() {
        Some(user) => Ok(json!({
            "id": user.id,
            "name": user.display_name,
            "displayName": user.display_name,
            "description": user.description,
            "profilePictureUrl": user.profile_image_url
        })),
        None => Ok(Response::builder()
            .status(StatusCode::NOT_FOUND)
            .body(())
            .unwrap()),
    }
}
