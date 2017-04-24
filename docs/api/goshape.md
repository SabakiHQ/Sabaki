# Go Shape Object

A Go shape object is a plain object with the following properties:

* `name` `<String>`
* `anchors` [`<SignedVertex[]>`](vertex.md)
* `vertices` [`<SignedVertex[]>`](vertex.md)
* `size` `<Integer>` *(optional)* - Shape only matches on square boards with this size
* `type` `<String>` *(optional)* - If set to `'corner'`, the distances to the board border will be matched as well
