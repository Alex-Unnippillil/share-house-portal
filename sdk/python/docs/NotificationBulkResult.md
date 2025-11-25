# NotificationBulkResult


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**index** | **int** |  | [optional] 
**success** | **bool** |  | [optional] 
**error** | [**NotificationBulkResultError**](NotificationBulkResultError.md) |  | [optional] 

## Example

```python
from share_house_portal_sdk.models.notification_bulk_result import NotificationBulkResult

# TODO update the JSON string below
json = "{}"
# create an instance of NotificationBulkResult from a JSON string
notification_bulk_result_instance = NotificationBulkResult.from_json(json)
# print the JSON string representation of the object
print(NotificationBulkResult.to_json())

# convert the object into a dict
notification_bulk_result_dict = notification_bulk_result_instance.to_dict()
# create an instance of NotificationBulkResult from a dict
notification_bulk_result_from_dict = NotificationBulkResult.from_dict(notification_bulk_result_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


