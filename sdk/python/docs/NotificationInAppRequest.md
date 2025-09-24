# NotificationInAppRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**type** | **str** |  | 
**notification** | [**InAppNotificationData**](InAppNotificationData.md) |  | 

## Example

```python
from share_house_portal_sdk.models.notification_in_app_request import NotificationInAppRequest

# TODO update the JSON string below
json = "{}"
# create an instance of NotificationInAppRequest from a JSON string
notification_in_app_request_instance = NotificationInAppRequest.from_json(json)
# print the JSON string representation of the object
print(NotificationInAppRequest.to_json())

# convert the object into a dict
notification_in_app_request_dict = notification_in_app_request_instance.to_dict()
# create an instance of NotificationInAppRequest from a dict
notification_in_app_request_from_dict = NotificationInAppRequest.from_dict(notification_in_app_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


