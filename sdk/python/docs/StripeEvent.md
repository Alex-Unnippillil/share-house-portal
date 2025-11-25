# StripeEvent


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **str** |  | 
**type** | **str** |  | 
**object** | **str** |  | 
**data** | **Dict[str, object]** |  | [optional] 
**created** | **int** | Unix timestamp for when the event was created. | [optional] 

## Example

```python
from share_house_portal_sdk.models.stripe_event import StripeEvent

# TODO update the JSON string below
json = "{}"
# create an instance of StripeEvent from a JSON string
stripe_event_instance = StripeEvent.from_json(json)
# print the JSON string representation of the object
print(StripeEvent.to_json())

# convert the object into a dict
stripe_event_dict = stripe_event_instance.to_dict()
# create an instance of StripeEvent from a dict
stripe_event_from_dict = StripeEvent.from_dict(stripe_event_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


