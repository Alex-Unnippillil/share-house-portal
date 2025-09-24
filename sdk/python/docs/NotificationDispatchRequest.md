# NotificationDispatchRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**type** | **str** |  | 
**notification** | [**InAppNotificationData**](InAppNotificationData.md) |  | 
**notifications** | [**List[NotificationBulkRequestNotificationsInner]**](NotificationBulkRequestNotificationsInner.md) |  | 

## Example

```python
from share_house_portal_sdk.models.notification_dispatch_request import NotificationDispatchRequest

# TODO update the JSON string below
json = "{}"
# create an instance of NotificationDispatchRequest from a JSON string
notification_dispatch_request_instance = NotificationDispatchRequest.from_json(json)
# print the JSON string representation of the object
print(NotificationDispatchRequest.to_json())

# convert the object into a dict
notification_dispatch_request_dict = notification_dispatch_request_instance.to_dict()
# create an instance of NotificationDispatchRequest from a dict
notification_dispatch_request_from_dict = NotificationDispatchRequest.from_dict(notification_dispatch_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


