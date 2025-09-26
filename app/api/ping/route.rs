use serde_json::json;
use vercel_runtime::{Body, Error, Request, Response, StatusCode, run};

const STATUS_OK: &str = "ok";
const VERSION: &str = env!("CARGO_PKG_VERSION");

#[tokio::main]
async fn main() -> Result<(), Error> {
    run(handler).await
}

pub async fn handler(_req: Request) -> Result<Response<Body>, Error> {
    let payload = json!({
        "version": VERSION,
        "status": STATUS_OK,
    });

    Ok(Response::builder()
        .status(StatusCode::OK)
        .header("Content-Type", "application/json")
        .body(payload.to_string().into())?)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::Value;

    fn body_to_string(body: &Body) -> String {
        match body {
            Body::Text(text) => text.clone(),
            Body::Binary(bytes) => {
                String::from_utf8(bytes.clone()).expect("response body should be valid UTF-8")
            }
            Body::Empty => String::new(),
        }
    }

    #[tokio::test]
    async fn ping_handler_returns_service_metadata() {
        let response = handler(Request::default())
            .await
            .expect("ping handler should respond successfully");

        assert_eq!(response.status(), StatusCode::OK);

        let body = body_to_string(response.body());
        assert!(!body.is_empty(), "ping response should include a body");

        let json: Value = serde_json::from_str(&body).expect("response body should be valid JSON");
        assert_eq!(json["status"], STATUS_OK);
        assert_eq!(json["version"], VERSION);
    }
}
