# ValidationErrorResponseAllOfDetails


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**field_errors** | **Dict[str, List[str]]** |  | [optional] 
**form_errors** | **List[str]** |  | [optional] 

## Example

```python
from share_house_portal_sdk.models.validation_error_response_all_of_details import ValidationErrorResponseAllOfDetails

# TODO update the JSON string below
json = "{}"
# create an instance of ValidationErrorResponseAllOfDetails from a JSON string
validation_error_response_all_of_details_instance = ValidationErrorResponseAllOfDetails.from_json(json)
# print the JSON string representation of the object
print(ValidationErrorResponseAllOfDetails.to_json())

# convert the object into a dict
validation_error_response_all_of_details_dict = validation_error_response_all_of_details_instance.to_dict()
# create an instance of ValidationErrorResponseAllOfDetails from a dict
validation_error_response_all_of_details_from_dict = ValidationErrorResponseAllOfDetails.from_dict(validation_error_response_all_of_details_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


