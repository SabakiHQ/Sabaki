# Tree Position Object

Sabaki encodes tree positions in a tree position object. The naive way is to directly store the [game tree node](gametree.md). The disadvantage is that we don't have direct access to surrounding nodes, so navigating will be difficult. We would have to traverse the whole game tree to find the node first. That's why Sabaki stores two pieces of information for a tree position. Given a game tree node `node`, a tree position object is the tuple

~~~js
[tree, index]
~~~

where `tree` is the [game tree](gametree.md) such that `tree.nodes` contains `node` and `index` denoting the integer index of `node` in `tree.nodes`. We can get to the node by:

~~~js
tree.nodes[index]
~~~
