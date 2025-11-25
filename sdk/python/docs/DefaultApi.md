# share_house_portal_sdk.DefaultApi

All URIs are relative to *https://app.roomsily.example*

Method | HTTP request | Description
------------- | ------------- | -------------
[**create_billing_portal_session**](DefaultApi.md#create_billing_portal_session) | **POST** /api/stripe/billing-portal | Create a Stripe Billing Portal session
[**create_checkout_session**](DefaultApi.md#create_checkout_session) | **POST** /api/stripe/checkout | Create a Stripe Checkout session
[**get_auth_callback**](DefaultApi.md#get_auth_callback) | **GET** /api/auth/callback | Complete Supabase OAuth callback
[**get_auth_google**](DefaultApi.md#get_auth_google) | **GET** /api/auth/google | Initiate Google OAuth via Supabase
[**get_supabase_sid_callback**](DefaultApi.md#get_supabase_sid_callback) | **GET** /api/sid/callback | Exchange a Supabase auth code for a session cookie
[**handle_stripe_webhook**](DefaultApi.md#handle_stripe_webhook) | **POST** /api/stripe/webhook | Process incoming Stripe webhook events
[**list_documents**](DefaultApi.md#list_documents) | **GET** /api/documents | List published tenant documents
[**list_notifications**](DefaultApi.md#list_notifications) | **GET** /api/notifications | Retrieve notifications for the authenticated user
[**send_notification**](DefaultApi.md#send_notification) | **POST** /api/notifications | Dispatch notifications through email and in-app channels
[**send_payment_receipt**](DefaultApi.md#send_payment_receipt) | **POST** /api/payments/receipt | Email a structured payment receipt via Resend
[**send_sample_email**](DefaultApi.md#send_sample_email) | **POST** /api/send | Send a static sample email


# **create_billing_portal_session**
> BillingPortalResponse create_billing_portal_session(billing_portal_request)

Create a Stripe Billing Portal session

### Example


```python
import share_house_portal_sdk
from share_house_portal_sdk.models.billing_portal_request import BillingPortalRequest
from share_house_portal_sdk.models.billing_portal_response import BillingPortalResponse
from share_house_portal_sdk.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://app.roomsily.example
# See configuration.py for a list of all supported configuration parameters.
configuration = share_house_portal_sdk.Configuration(
    host = "https://app.roomsily.example"
)


# Enter a context with an instance of the API client
with share_house_portal_sdk.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = share_house_portal_sdk.DefaultApi(api_client)
    billing_portal_request = share_house_portal_sdk.BillingPortalRequest() # BillingPortalRequest | 

    try:
        # Create a Stripe Billing Portal session
        api_response = api_instance.create_billing_portal_session(billing_portal_request)
        print("The response of DefaultApi->create_billing_portal_session:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling DefaultApi->create_billing_portal_session: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **billing_portal_request** | [**BillingPortalRequest**](BillingPortalRequest.md)|  | 

### Return type

[**BillingPortalResponse**](BillingPortalResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Billing portal session successfully created. |  -  |
**400** | Missing or invalid Stripe customer ID. |  -  |
**500** | Stripe API not configured or returned an error. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **create_checkout_session**
> CheckoutSessionResponse create_checkout_session(checkout_session_request)

Create a Stripe Checkout session

### Example


```python
import share_house_portal_sdk
from share_house_portal_sdk.models.checkout_session_request import CheckoutSessionRequest
from share_house_portal_sdk.models.checkout_session_response import CheckoutSessionResponse
from share_house_portal_sdk.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://app.roomsily.example
# See configuration.py for a list of all supported configuration parameters.
configuration = share_house_portal_sdk.Configuration(
    host = "https://app.roomsily.example"
)


# Enter a context with an instance of the API client
with share_house_portal_sdk.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = share_house_portal_sdk.DefaultApi(api_client)
    checkout_session_request = share_house_portal_sdk.CheckoutSessionRequest() # CheckoutSessionRequest | 

    try:
        # Create a Stripe Checkout session
        api_response = api_instance.create_checkout_session(checkout_session_request)
        print("The response of DefaultApi->create_checkout_session:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling DefaultApi->create_checkout_session: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **checkout_session_request** | [**CheckoutSessionRequest**](CheckoutSessionRequest.md)|  | 

### Return type

[**CheckoutSessionResponse**](CheckoutSessionResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Checkout session ready for redirection. |  -  |
**400** | Missing price identifier or invalid quantity. |  -  |
**500** | Stripe API threw an unexpected error. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **get_auth_callback**
> get_auth_callback(access_token=access_token, refresh_token=refresh_token)

Complete Supabase OAuth callback

Finalizes the OAuth flow by persisting the refresh token associated with the signed-in Supabase user.
Redirects to the application shell when successful.


### Example


```python
import share_house_portal_sdk
from share_house_portal_sdk.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://app.roomsily.example
# See configuration.py for a list of all supported configuration parameters.
configuration = share_house_portal_sdk.Configuration(
    host = "https://app.roomsily.example"
)


# Enter a context with an instance of the API client
with share_house_portal_sdk.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = share_house_portal_sdk.DefaultApi(api_client)
    access_token = 'access_token_example' # str | Access token returned by Supabase. (optional)
    refresh_token = 'refresh_token_example' # str | Refresh token returned by Supabase. (optional)

    try:
        # Complete Supabase OAuth callback
        api_instance.get_auth_callback(access_token=access_token, refresh_token=refresh_token)
    except Exception as e:
        print("Exception when calling DefaultApi->get_auth_callback: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **access_token** | **str**| Access token returned by Supabase. | [optional] 
 **refresh_token** | **str**| Refresh token returned by Supabase. | [optional] 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**302** | Redirects to the base application URL after storing the refresh token. |  * Location - Original request origin. <br>  |
**401** | Supabase user session was not available. |  -  |
**500** | Failed to persist the refresh token. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **get_auth_google**
> get_auth_google(code=code, next=next)

Initiate Google OAuth via Supabase

Starts the Google OAuth sign-in flow handled by Supabase. Successful calls redirect the
requester to the Supabase hosted OAuth consent screen and eventually back to the provided
`next` path.


### Example


```python
import share_house_portal_sdk
from share_house_portal_sdk.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://app.roomsily.example
# See configuration.py for a list of all supported configuration parameters.
configuration = share_house_portal_sdk.Configuration(
    host = "https://app.roomsily.example"
)


# Enter a context with an instance of the API client
with share_house_portal_sdk.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = share_house_portal_sdk.DefaultApi(api_client)
    code = 'code_example' # str | OAuth authorization code returned from Google during the redirect flow. (optional)
    next = 'next_example' # str | Relative path to redirect to once Supabase completes the OAuth handshake. (optional)

    try:
        # Initiate Google OAuth via Supabase
        api_instance.get_auth_google(code=code, next=next)
    except Exception as e:
        print("Exception when calling DefaultApi->get_auth_google: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **code** | **str**| OAuth authorization code returned from Google during the redirect flow. | [optional] 
 **next** | **str**| Relative path to redirect to once Supabase completes the OAuth handshake. | [optional] 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**302** | Redirects to either the Supabase OAuth consent screen or the requested &#x60;next&#x60; URL. |  * Location - Original request origin. <br>  |
**401** | Supabase rejected the OAuth attempt. |  -  |
**500** | Unexpected error completing the OAuth hand-off. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **get_supabase_sid_callback**
> get_supabase_sid_callback(code=code)

Exchange a Supabase auth code for a session cookie

### Example


```python
import share_house_portal_sdk
from share_house_portal_sdk.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://app.roomsily.example
# See configuration.py for a list of all supported configuration parameters.
configuration = share_house_portal_sdk.Configuration(
    host = "https://app.roomsily.example"
)


# Enter a context with an instance of the API client
with share_house_portal_sdk.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = share_house_portal_sdk.DefaultApi(api_client)
    code = 'code_example' # str | Authorization code issued by Supabase. (optional)

    try:
        # Exchange a Supabase auth code for a session cookie
        api_instance.get_supabase_sid_callback(code=code)
    except Exception as e:
        print("Exception when calling DefaultApi->get_supabase_sid_callback: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **code** | **str**| Authorization code issued by Supabase. | [optional] 

### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**302** | Redirects to the request origin after exchanging the session. |  * Location - Original request origin. <br>  |
**500** | Supabase client credentials missing or invalid. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **handle_stripe_webhook**
> str handle_stripe_webhook(stripe_event)

Process incoming Stripe webhook events

Validates the Stripe signature header and stores payment artefacts in Supabase.

### Example


```python
import share_house_portal_sdk
from share_house_portal_sdk.models.stripe_event import StripeEvent
from share_house_portal_sdk.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://app.roomsily.example
# See configuration.py for a list of all supported configuration parameters.
configuration = share_house_portal_sdk.Configuration(
    host = "https://app.roomsily.example"
)


# Enter a context with an instance of the API client
with share_house_portal_sdk.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = share_house_portal_sdk.DefaultApi(api_client)
    stripe_event = share_house_portal_sdk.StripeEvent() # StripeEvent | 

    try:
        # Process incoming Stripe webhook events
        api_response = api_instance.handle_stripe_webhook(stripe_event)
        print("The response of DefaultApi->handle_stripe_webhook:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling DefaultApi->handle_stripe_webhook: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **stripe_event** | [**StripeEvent**](StripeEvent.md)|  | 

### Return type

**str**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: text/plain

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Event processed successfully. |  -  |
**400** | Signature validation failed. |  -  |
**500** | Supabase or Stripe configuration missing. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **list_documents**
> DocumentListResponse list_documents(revision=revision)

List published tenant documents

Returns cached document metadata with support for revision snapshots and conditional requests.

### Example


```python
import share_house_portal_sdk
from share_house_portal_sdk.models.document_list_response import DocumentListResponse
from share_house_portal_sdk.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://app.roomsily.example
# See configuration.py for a list of all supported configuration parameters.
configuration = share_house_portal_sdk.Configuration(
    host = "https://app.roomsily.example"
)


# Enter a context with an instance of the API client
with share_house_portal_sdk.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = share_house_portal_sdk.DefaultApi(api_client)
    revision = 'revision_example' # str | Revision identifier for testing alternative payloads. (optional)

    try:
        # List published tenant documents
        api_response = api_instance.list_documents(revision=revision)
        print("The response of DefaultApi->list_documents:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling DefaultApi->list_documents: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **revision** | **str**| Revision identifier for testing alternative payloads. | [optional] 

### Return type

[**DocumentListResponse**](DocumentListResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Document collection payload. |  * ETag - Weak ETag derived from the collection signature. <br>  |
**304** | Cached representation still valid. |  -  |
**500** | Unexpected failure computing collection metadata. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **list_notifications**
> NotificationListResponse list_notifications(start_date=start_date, end_date=end_date, limit=limit, page=page)

Retrieve notifications for the authenticated user

Filters notifications by optional date range, page, and limit parameters.

### Example

* Api Key Authentication (supabaseSession):

```python
import share_house_portal_sdk
from share_house_portal_sdk.models.notification_list_response import NotificationListResponse
from share_house_portal_sdk.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://app.roomsily.example
# See configuration.py for a list of all supported configuration parameters.
configuration = share_house_portal_sdk.Configuration(
    host = "https://app.roomsily.example"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure API key authorization: supabaseSession
configuration.api_key['supabaseSession'] = os.environ["API_KEY"]

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['supabaseSession'] = 'Bearer'

# Enter a context with an instance of the API client
with share_house_portal_sdk.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = share_house_portal_sdk.DefaultApi(api_client)
    start_date = '2013-10-20T19:20:30+01:00' # datetime | ISO-8601 timestamp inclusive lower bound. (optional)
    end_date = '2013-10-20T19:20:30+01:00' # datetime | ISO-8601 timestamp inclusive upper bound. Future dates are clamped to \"now\". (optional)
    limit = 56 # int | Page size. Defaults to 20 and clamps at 100. (optional)
    page = 56 # int | Page index starting at 1. Requests greater than 50 are clamped. (optional)

    try:
        # Retrieve notifications for the authenticated user
        api_response = api_instance.list_notifications(start_date=start_date, end_date=end_date, limit=limit, page=page)
        print("The response of DefaultApi->list_notifications:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling DefaultApi->list_notifications: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **start_date** | **datetime**| ISO-8601 timestamp inclusive lower bound. | [optional] 
 **end_date** | **datetime**| ISO-8601 timestamp inclusive upper bound. Future dates are clamped to \&quot;now\&quot;. | [optional] 
 **limit** | **int**| Page size. Defaults to 20 and clamps at 100. | [optional] 
 **page** | **int**| Page index starting at 1. Requests greater than 50 are clamped. | [optional] 

### Return type

[**NotificationListResponse**](NotificationListResponse.md)

### Authorization

[supabaseSession](../README.md#supabaseSession)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Notification results for the current user. |  -  |
**400** | Invalid pagination or date parameters supplied. |  -  |
**401** | Supabase session missing or invalid. |  -  |
**500** | Supabase query failed. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **send_notification**
> NotificationDispatchResponse send_notification(notification_dispatch_request)

Dispatch notifications through email and in-app channels

Routes a validated notification payload to the configured provider or Supabase storage.

### Example


```python
import share_house_portal_sdk
from share_house_portal_sdk.models.notification_dispatch_request import NotificationDispatchRequest
from share_house_portal_sdk.models.notification_dispatch_response import NotificationDispatchResponse
from share_house_portal_sdk.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://app.roomsily.example
# See configuration.py for a list of all supported configuration parameters.
configuration = share_house_portal_sdk.Configuration(
    host = "https://app.roomsily.example"
)


# Enter a context with an instance of the API client
with share_house_portal_sdk.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = share_house_portal_sdk.DefaultApi(api_client)
    notification_dispatch_request = share_house_portal_sdk.NotificationDispatchRequest() # NotificationDispatchRequest | 

    try:
        # Dispatch notifications through email and in-app channels
        api_response = api_instance.send_notification(notification_dispatch_request)
        print("The response of DefaultApi->send_notification:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling DefaultApi->send_notification: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **notification_dispatch_request** | [**NotificationDispatchRequest**](NotificationDispatchRequest.md)|  | 

### Return type

[**NotificationDispatchResponse**](NotificationDispatchResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Notification send attempt succeeded for every requested channel. |  -  |
**400** | Validation failed for the requested notification. |  -  |
**500** | Downstream provider rejected the request or threw an unexpected error. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **send_payment_receipt**
> PaymentReceiptResponse send_payment_receipt(payment_receipt_request)

Email a structured payment receipt via Resend

### Example


```python
import share_house_portal_sdk
from share_house_portal_sdk.models.payment_receipt_request import PaymentReceiptRequest
from share_house_portal_sdk.models.payment_receipt_response import PaymentReceiptResponse
from share_house_portal_sdk.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://app.roomsily.example
# See configuration.py for a list of all supported configuration parameters.
configuration = share_house_portal_sdk.Configuration(
    host = "https://app.roomsily.example"
)


# Enter a context with an instance of the API client
with share_house_portal_sdk.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = share_house_portal_sdk.DefaultApi(api_client)
    payment_receipt_request = share_house_portal_sdk.PaymentReceiptRequest() # PaymentReceiptRequest | 

    try:
        # Email a structured payment receipt via Resend
        api_response = api_instance.send_payment_receipt(payment_receipt_request)
        print("The response of DefaultApi->send_payment_receipt:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling DefaultApi->send_payment_receipt: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **payment_receipt_request** | [**PaymentReceiptRequest**](PaymentReceiptRequest.md)|  | 

### Return type

[**PaymentReceiptResponse**](PaymentReceiptResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Receipt email queued with Resend. |  -  |
**400** | Payload failed schema validation. |  -  |
**500** | Resend API was not configured or rejected the email. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **send_sample_email**
> ResendEmailResponse send_sample_email()

Send a static sample email

Development-only helper that exercises the Resend integration with a canned payload.

### Example


```python
import share_house_portal_sdk
from share_house_portal_sdk.models.resend_email_response import ResendEmailResponse
from share_house_portal_sdk.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://app.roomsily.example
# See configuration.py for a list of all supported configuration parameters.
configuration = share_house_portal_sdk.Configuration(
    host = "https://app.roomsily.example"
)


# Enter a context with an instance of the API client
with share_house_portal_sdk.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = share_house_portal_sdk.DefaultApi(api_client)

    try:
        # Send a static sample email
        api_response = api_instance.send_sample_email()
        print("The response of DefaultApi->send_sample_email:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling DefaultApi->send_sample_email: %s\n" % e)
```



### Parameters

This endpoint does not need any parameter.

### Return type

[**ResendEmailResponse**](ResendEmailResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Sample email accepted by Resend. |  -  |
**500** | Resend rejected the message or was not configured. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

