# Properties
## Path
 - Type:
    - String
## Type
 - Type:
    - String
 - Value must be "mono-color" or "multi-color"
## Mono color
 - Type:
    - String
 - Default value:
    - #000000
 - Note:
    - If [type](#type) is "multi-color":
       - Will not have any affect on the image 
    - Elseif [type](#type) is "mono-color":
      - Use CSS filters to manipulate the [image's color](#mono-color-icon-policy) to the [target color](#mono-color)

# Description
 - A resource descriptor that describes an image resource

# Mono-color icon policy
 - All [mono-color icons](#type) should be uniformly black
    - If an mono-color icon isn't exactly #000000:
       - Notify developer immediately