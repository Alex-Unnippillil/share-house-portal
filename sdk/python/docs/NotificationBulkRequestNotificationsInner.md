# NotificationBulkRequestNotificationsInner


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**to** | [**EmailRecipient**](EmailRecipient.md) |  | 
**subject** | **str** |  | 
**template** | **str** |  | 
**data** | **Dict[str, object]** |  | [optional] 
**user_id** | **str** |  | 
**title** | **str** |  | 
**message** | **str** |  | 
**type** | **str** |  | 
**action_url** | **str** |  | [optional] 
**metadata** | **Dict[str, object]** |  | [optional] 

## Example

```python
from share_house_portal_sdk.models.notification_bulk_request_notifications_inner import NotificationBulkRequestNotificationsInner

# TODO update the JSON string below
json = "{}"
# create an instance of NotificationBulkRequestNotificationsInner from a JSON string
notification_bulk_request_notifications_inner_instance = NotificationBulkRequestNotificationsInner.from_json(json)
# print the JSON string representation of the object
print(NotificationBulkRequestNotificationsInner.to_json())

# convert the object into a dict
notification_bulk_request_notifications_inner_dict = notification_bulk_request_notifications_inner_instance.to_dict()
# create an instance of NotificationBulkRequestNotificationsInner from a dict
notification_bulk_request_notifications_inner_from_dict = NotificationBulkRequestNotificationsInner.from_dict(notification_bulk_request_notifications_inner_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


