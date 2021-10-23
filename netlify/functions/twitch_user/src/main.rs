use aws_lambda_events::encodings::Body;
use aws_lambda_events::event::apigw::{ApiGatewayProxyRequest, ApiGatewayProxyResponse};
use http::header::HeaderMap;
use lambda_runtime::{handler_fn, Context, Error};
use reqwest;
use serde_json::json;
use twitch_api2::helix::HelixClient;
use twitch_oauth2::{tokens::errors::AppAccessTokenError, AppAccessToken, ClientId, ClientSecret};

#[tokio::main]
async fn main() -> Result<(), Error> {
    let handler_fn = handler_fn(handler);
    lambda_runtime::run(handler_fn).await?;
    Ok(())
}

async fn handler(
    event: ApiGatewayProxyRequest,
    _ctx: Context,
) -> Result<ApiGatewayProxyResponse, Error> {
    let user_id = match event.query_string_parameters.get("user_id") {
        Some(val) => val.to_string(),
        None => {
            return Ok(ApiGatewayProxyResponse {
                status_code: 400,
                headers: HeaderMap::new(),
                multi_value_headers: HeaderMap::new(),
                body: Some(Body::Text(
                    json!({"message": "user_id query string parameter is required"}).to_string(),
                )),
                is_base64_encoded: Some(false),
            });
        }
    };

    match get_user_from_id(user_id).await.unwrap() {
        Some(user) => Ok(ApiGatewayProxyResponse {
            status_code: 200,
            headers: HeaderMap::new(),
            multi_value_headers: HeaderMap::new(),
            body: Some(Body::Text(
                json!({
                    "id": user.id,
                    "name": user.display_name,
                    "displayName": user.display_name,
                    "description": user.description,
                    "profilePictureUrl": user.profile_image_url
                })
                .to_string(),
            )),
            is_base64_encoded: Some(false),
        }),
        None => Ok(ApiGatewayProxyResponse {
            status_code: 400,
            headers: HeaderMap::new(),
            multi_value_headers: HeaderMap::new(),
            body: Some(Body::Text(
                json!({"message": "user_id query string parameter is required"}).to_string(),
            )),
            is_base64_encoded: Some(false),
        }),
    }
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
        &reqwest::Client::new(),
        client_id,
        client_secret,
        vec![],
    )
    .await
    {
        Ok(t) => t,
        Err(AppAccessTokenError::Request(e)) => panic!("got error: {:?}", e),
        Err(e) => panic!("{:?}", e),
    };

    let helix: HelixClient<'static, reqwest::Client> = HelixClient::default();

    Ok(helix.get_user_from_id(user_id, &token).await?)
}
