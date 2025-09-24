# NotificationPagination


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**page** | **int** |  | 
**limit** | **int** |  | 
**total** | **int** |  | 
**has_more** | **bool** |  | 

## Example

```python
from share_house_portal_sdk.models.notification_pagination import NotificationPagination

# TODO update the JSON string below
json = "{}"
# create an instance of NotificationPagination from a JSON string
notification_pagination_instance = NotificationPagination.from_json(json)
# print the JSON string representation of the object
print(NotificationPagination.to_json())

# convert the object into a dict
notification_pagination_dict = notification_pagination_instance.to_dict()
# create an instance of NotificationPagination from a dict
notification_pagination_from_dict = NotificationPagination.from_dict(notification_pagination_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


