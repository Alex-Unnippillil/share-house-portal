# EmailNotificationData


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**to** | [**EmailRecipient**](EmailRecipient.md) |  | 
**subject** | **str** |  | 
**template** | **str** |  | 
**data** | **Dict[str, object]** |  | [optional] 
**user_id** | **str** |  | [optional] 

## Example

```python
from share_house_portal_sdk.models.email_notification_data import EmailNotificationData

# TODO update the JSON string below
json = "{}"
# create an instance of EmailNotificationData from a JSON string
email_notification_data_instance = EmailNotificationData.from_json(json)
# print the JSON string representation of the object
print(EmailNotificationData.to_json())

# convert the object into a dict
email_notification_data_dict = email_notification_data_instance.to_dict()
# create an instance of EmailNotificationData from a dict
email_notification_data_from_dict = EmailNotificationData.from_dict(email_notification_data_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


