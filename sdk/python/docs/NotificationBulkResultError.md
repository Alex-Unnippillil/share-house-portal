# NotificationBulkResultError

Error message or provider payload when a bulk request entry failed.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------

## Example

```python
from share_house_portal_sdk.models.notification_bulk_result_error import NotificationBulkResultError

# TODO update the JSON string below
json = "{}"
# create an instance of NotificationBulkResultError from a JSON string
notification_bulk_result_error_instance = NotificationBulkResultError.from_json(json)
# print the JSON string representation of the object
print(NotificationBulkResultError.to_json())

# convert the object into a dict
notification_bulk_result_error_dict = notification_bulk_result_error_instance.to_dict()
# create an instance of NotificationBulkResultError from a dict
notification_bulk_result_error_from_dict = NotificationBulkResultError.from_dict(notification_bulk_result_error_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


