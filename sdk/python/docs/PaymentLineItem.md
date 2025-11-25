# PaymentLineItem


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**description** | **str** |  | [optional] 
**quantity** | **float** |  | [optional] 
**unit_amount** | **float** |  | [optional] 
**total_amount** | **float** |  | [optional] 

## Example

```python
from share_house_portal_sdk.models.payment_line_item import PaymentLineItem

# TODO update the JSON string below
json = "{}"
# create an instance of PaymentLineItem from a JSON string
payment_line_item_instance = PaymentLineItem.from_json(json)
# print the JSON string representation of the object
print(PaymentLineItem.to_json())

# convert the object into a dict
payment_line_item_dict = payment_line_item_instance.to_dict()
# create an instance of PaymentLineItem from a dict
payment_line_item_from_dict = PaymentLineItem.from_dict(payment_line_item_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


