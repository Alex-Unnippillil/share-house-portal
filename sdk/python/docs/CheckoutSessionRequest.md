# CheckoutSessionRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**price_id** | **str** |  | 
**quantity** | **int** |  | [optional] [default to 1]
**mode** | **str** |  | [optional] [default to 'payment']
**metadata** | **Dict[str, str]** |  | [optional] 

## Example

```python
from share_house_portal_sdk.models.checkout_session_request import CheckoutSessionRequest

# TODO update the JSON string below
json = "{}"
# create an instance of CheckoutSessionRequest from a JSON string
checkout_session_request_instance = CheckoutSessionRequest.from_json(json)
# print the JSON string representation of the object
print(CheckoutSessionRequest.to_json())

# convert the object into a dict
checkout_session_request_dict = checkout_session_request_instance.to_dict()
# create an instance of CheckoutSessionRequest from a dict
checkout_session_request_from_dict = CheckoutSessionRequest.from_dict(checkout_session_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


