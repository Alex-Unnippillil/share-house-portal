# NotificationEmailRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**type** | **str** |  | 
**notification** | [**EmailNotificationData**](EmailNotificationData.md) |  | 

## Example

```python
from share_house_portal_sdk.models.notification_email_request import NotificationEmailRequest

# TODO update the JSON string below
json = "{}"
# create an instance of NotificationEmailRequest from a JSON string
notification_email_request_instance = NotificationEmailRequest.from_json(json)
# print the JSON string representation of the object
print(NotificationEmailRequest.to_json())

# convert the object into a dict
notification_email_request_dict = notification_email_request_instance.to_dict()
# create an instance of NotificationEmailRequest from a dict
notification_email_request_from_dict = NotificationEmailRequest.from_dict(notification_email_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


