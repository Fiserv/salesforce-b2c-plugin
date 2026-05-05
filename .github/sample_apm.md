# Architecture

## Purpose
This document describes a sample input for the CREATE_APM agent and is meant to be used as reference for both a developer executing the agent and the agent itself for parameter validation. What follows is an example of a few APM input parameters and what the developer should expect to see when running the apm generation

## Sample 1: Orders Button APM

```json
{
    apm_id: FAKEAPM
    type: button
    transaction_type: order
    display_name: Fae Aye PM
    config_list: [
        {
            config_option: CommerceHubFakeAPMEnable
            config_type: boolean
            display_name: Fay Aye PM Enable
            default: false
        },
        {
            config_option: PaymentType
            config_type: enum-of-string
            display_name: CommerceHubFakeAPM Charge Type
            values: {
                'Authorize':'AUTH',
                'Sale (Auth &amp; Capture)':'SALE'
            }
            default: AUTH
            dependency: CommerceHubFakeAPMEnable
        }
    ]
}
```

This input should create a basic, barebones, buttons APM named Fae Aye PM (Fake APM, lol) that runs proccessing through the orders flow. The only available configs for this APM should be the Enable and the Charge Type configs as is standard for most APMs within the repository.

## Sample 2: Charges Button APM

```json
{
    apm_id: REALAPM
    type: button
    transaction_type: charge
    display_name: Real Aye PM
}
```

This input should create a basic, barebones, buttons APM named Real Aye PM (Real APM, lol) that runs proccessing through the charges flow. The only available configs for this APM should be the Enable and the Charge Type configs which are both inserted by the agent as minimum baseline config options.

## Sample 3: Charges Iframe APM

```json
{
    apm_id: REALFORM
    type: iframe
    transaction_type: charge
    display_name: Real Form
    config_list: [
        {
            config_option: RandomColor
            config_type: string
            display_name: Random Color Text
            default: Red
        },
        {
            config_option: Favorite Number
            config_type: int
            display_name: Favorite Number
            default: 7
        }
    ]
    fields: {
        [{ 'based ball', 'dropdown' }],
        [{ 'coolio', 'text', true }, { 'tiny man', 'dropdown' }],
        [{ 'big man', 'text' }]
    }
}
```

This input should create an ifram APM named Real Form that runs proccessing through the charges flow. This form has additional configs available called Random Color Text and Favorite Number along with the baseline Enable and Charge Type configs which are both inserted by the agent as minimum baseline config options. The structure of the form should be...

First Row: Based Ball dropdown field
Second Row: Coolio text field (maskable) and Tiny Man dropdown field
Third Row: Big Man text field