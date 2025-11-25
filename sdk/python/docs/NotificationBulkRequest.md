# NotificationBulkRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**type** | **str** |  | 
**notifications** | [**List[NotificationBulkRequestNotificationsInner]**](NotificationBulkRequestNotificationsInner.md) |  | 

## Example

```python
from share_house_portal_sdk.models.notification_bulk_request import NotificationBulkRequest

# TODO update the JSON string below
json = "{}"
# create an instance of NotificationBulkRequest from a JSON string
notification_bulk_request_instance = NotificationBulkRequest.from_json(json)
# print the JSON string representation of the object
print(NotificationBulkRequest.to_json())

# convert the object into a dict
notification_bulk_request_dict = notification_bulk_request_instance.to_dict()
# create an instance of NotificationBulkRequest from a dict
notification_bulk_request_from_dict = NotificationBulkRequest.from_dict(notification_bulk_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


