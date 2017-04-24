# Setting

The `setting` module is responsible for reading/writing Sabaki's configuration file. Sabaki saves its configuration in a simple JSON object, meaning it consists of keys and values.

To access this module use:

~~~js
const {setting} = sabaki.modules
~~~

## Events

To listen to events, use the [`EventEmitter`](https://nodejs.org/api/events.html#events_class_eventemitter) `setting.events` like this:

~~~js
setting.events.on('change', (evt) => {
    console.log('Something changed!')
})
~~~

### Event: 'change'

* `evt` `<Object>`
    * `key` `<String>`

The `change` event is emitted when someone changes `key` to another value using `setting.set(key, value)`.

## Methods

### setting.load()

Loads data from configuration file.

### setting.save()

Saves data to configuration file. Usually not needed because it is called by `setting.set`.

### setting.get(key)

* `key` `<String>`

Returns the value of the given setting `key`.

### setting.set(key, value)

* `key` `<String>`
* `value`

Changes corresponding setting `key` to `value`, emits the `change` event, and saves configuration file.
