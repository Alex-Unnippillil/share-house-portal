# BillingPortalRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**customer_id** | **str** |  | 

## Example

```python
from share_house_portal_sdk.models.billing_portal_request import BillingPortalRequest

# TODO update the JSON string below
json = "{}"
# create an instance of BillingPortalRequest from a JSON string
billing_portal_request_instance = BillingPortalRequest.from_json(json)
# print the JSON string representation of the object
print(BillingPortalRequest.to_json())

# convert the object into a dict
billing_portal_request_dict = billing_portal_request_instance.to_dict()
# create an instance of BillingPortalRequest from a dict
billing_portal_request_from_dict = BillingPortalRequest.from_dict(billing_portal_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


