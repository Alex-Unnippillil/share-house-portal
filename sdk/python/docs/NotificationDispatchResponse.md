# NotificationDispatchResponse


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**success** | **bool** |  | 
**error** | **str** |  | [optional] 
**data** | **object** |  | [optional] 
**results** | [**List[NotificationBulkResult]**](NotificationBulkResult.md) |  | [optional] 

## Example

```python
from share_house_portal_sdk.models.notification_dispatch_response import NotificationDispatchResponse

# TODO update the JSON string below
json = "{}"
# create an instance of NotificationDispatchResponse from a JSON string
notification_dispatch_response_instance = NotificationDispatchResponse.from_json(json)
# print the JSON string representation of the object
print(NotificationDispatchResponse.to_json())

# convert the object into a dict
notification_dispatch_response_dict = notification_dispatch_response_instance.to_dict()
# create an instance of NotificationDispatchResponse from a dict
notification_dispatch_response_from_dict = NotificationDispatchResponse.from_dict(notification_dispatch_response_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


