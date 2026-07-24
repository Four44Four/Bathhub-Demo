# Properties
## Content
 - Type:
    - String
## Color
 - Type:
    - String
## Font size
 - Type
    - Integer
 - Default value:
    - 14
## Weight
 - Type:
    - [TextWeight](../text_weight.md)
 - Default value:
    - TextWeight.REGULAR

# Description
 - A descriptor for rendered text elements
 - [Text content property](#content) will be displayed with [this size point font](#font-size) in the following font weights depending on [the weight property](#weight):
    - [TextWeight.REGULAR](./text_weight.md) -> [regular font](./resources.md#regular-font)
    - [TextWeight.BOLD](./text_weight.md) -> [bold font](./resources.md#bold-font)
    - [TextWeight.LIGHT](./text_weight.md) -> [light font](./resources.md#light-font)