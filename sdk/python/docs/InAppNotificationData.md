# InAppNotificationData


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**user_id** | **str** |  | 
**title** | **str** |  | 
**message** | **str** |  | 
**type** | **str** |  | 
**action_url** | **str** |  | [optional] 
**metadata** | **Dict[str, object]** |  | [optional] 

## Example

```python
from share_house_portal_sdk.models.in_app_notification_data import InAppNotificationData

# TODO update the JSON string below
json = "{}"
# create an instance of InAppNotificationData from a JSON string
in_app_notification_data_instance = InAppNotificationData.from_json(json)
# print the JSON string representation of the object
print(InAppNotificationData.to_json())

# convert the object into a dict
in_app_notification_data_dict = in_app_notification_data_instance.to_dict()
# create an instance of InAppNotificationData from a dict
in_app_notification_data_from_dict = InAppNotificationData.from_dict(in_app_notification_data_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


