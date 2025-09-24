# PaymentReceiptRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**customer_email** | **str** |  | 
**customer_name** | **str** |  | 
**payment_id** | **str** |  | 
**amount_paid** | **float** |  | 
**currency** | **str** |  | 
**payment_date** | **datetime** |  | [optional] 
**items** | [**List[PaymentLineItem]**](PaymentLineItem.md) |  | [optional] 
**business_name** | **str** |  | [optional] 
**support_email** | **str** |  | [optional] 
**billing_address** | **str** |  | [optional] 
**notes** | **str** |  | [optional] 
**subtotal_amount** | **float** |  | [optional] 
**tax_amount** | **float** |  | [optional] 
**discount_amount** | **float** |  | [optional] 
**send_copy_to** | **List[str]** |  | [optional] 

## Example

```python
from share_house_portal_sdk.models.payment_receipt_request import PaymentReceiptRequest

# TODO update the JSON string below
json = "{}"
# create an instance of PaymentReceiptRequest from a JSON string
payment_receipt_request_instance = PaymentReceiptRequest.from_json(json)
# print the JSON string representation of the object
print(PaymentReceiptRequest.to_json())

# convert the object into a dict
payment_receipt_request_dict = payment_receipt_request_instance.to_dict()
# create an instance of PaymentReceiptRequest from a dict
payment_receipt_request_from_dict = PaymentReceiptRequest.from_dict(payment_receipt_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


