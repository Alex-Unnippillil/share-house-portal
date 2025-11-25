# ResendEmailResponse

Raw response returned by the Resend SDK.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **str** |  | [optional] 

## Example

```python
from share_house_portal_sdk.models.resend_email_response import ResendEmailResponse

# TODO update the JSON string below
json = "{}"
# create an instance of ResendEmailResponse from a JSON string
resend_email_response_instance = ResendEmailResponse.from_json(json)
# print the JSON string representation of the object
print(ResendEmailResponse.to_json())

# convert the object into a dict
resend_email_response_dict = resend_email_response_instance.to_dict()
# create an instance of ResendEmailResponse from a dict
resend_email_response_from_dict = ResendEmailResponse.from_dict(resend_email_response_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


