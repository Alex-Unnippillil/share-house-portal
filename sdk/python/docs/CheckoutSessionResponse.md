# CheckoutSessionResponse


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **str** |  | 
**url** | **str** |  | 

## Example

```python
from share_house_portal_sdk.models.checkout_session_response import CheckoutSessionResponse

# TODO update the JSON string below
json = "{}"
# create an instance of CheckoutSessionResponse from a JSON string
checkout_session_response_instance = CheckoutSessionResponse.from_json(json)
# print the JSON string representation of the object
print(CheckoutSessionResponse.to_json())

# convert the object into a dict
checkout_session_response_dict = checkout_session_response_instance.to_dict()
# create an instance of CheckoutSessionResponse from a dict
checkout_session_response_from_dict = CheckoutSessionResponse.from_dict(checkout_session_response_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


