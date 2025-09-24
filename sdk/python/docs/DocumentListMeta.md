# DocumentListMeta


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**count** | **int** |  | 
**latest_updated_at** | **datetime** |  | 
**revision** | **str** |  | 

## Example

```python
from share_house_portal_sdk.models.document_list_meta import DocumentListMeta

# TODO update the JSON string below
json = "{}"
# create an instance of DocumentListMeta from a JSON string
document_list_meta_instance = DocumentListMeta.from_json(json)
# print the JSON string representation of the object
print(DocumentListMeta.to_json())

# convert the object into a dict
document_list_meta_dict = document_list_meta_instance.to_dict()
# create an instance of DocumentListMeta from a dict
document_list_meta_from_dict = DocumentListMeta.from_dict(document_list_meta_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


