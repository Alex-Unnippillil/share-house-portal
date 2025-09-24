# DocumentRecord


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **str** |  | 
**title** | **str** |  | 
**status** | **str** |  | 
**updated_at** | **datetime** |  | 
**tenant_id** | **str** |  | 

## Example

```python
from share_house_portal_sdk.models.document_record import DocumentRecord

# TODO update the JSON string below
json = "{}"
# create an instance of DocumentRecord from a JSON string
document_record_instance = DocumentRecord.from_json(json)
# print the JSON string representation of the object
print(DocumentRecord.to_json())

# convert the object into a dict
document_record_dict = document_record_instance.to_dict()
# create an instance of DocumentRecord from a dict
document_record_from_dict = DocumentRecord.from_dict(document_record_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


