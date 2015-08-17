# gemini-scrollbar

[![npm-image](https://img.shields.io/npm/v/gemini-scrollbar.svg?style=flat-square)](https://www.npmjs.com/package/gemini-scrollbar)
![bower-image](https://img.shields.io/bower/v/gemini-scrollbar.svg?style=flat-square)

Custom overlay-scrollbars with native scrolling mechanism for web applications (when needed).

###### Problem Description

Nowadays, many OS's provides “overlay-scrollbars” natively. Those scrollbars looks nice and works well (mostly mobile browsers). I am OK with that, but while building web apps you may still found yourself searching on how to customize the remaining portion of ‘ugly’ scrollbars out there, specially when they do not fit with your designs. e.g: “*having a sidebar with a dark-background + native-**non-floating**-scrollbars*” ...hum, ugly. Even when this problem can be merely visual, for me is a way of enhancing the user experience.

###### Constraints
 
- Fallback to the native scrollbars when the OS/browser supports “overlay-scrollbars” natively
- Mimic the native scrollbar behaviour when replaced with the custom ones (click, drag...)
- IE9+ support

###### Solution Proposal

First, we check the scrollbar size, if the scrollbar size is equal to zero (which means the scrollbars are already “over the content” natively) then we **do nothing**, otherwise we “hide” the native scrollbar (**leaving its functionality intact**) and create a new pair of “scrollbars” made of `div`s that you can fully customize with CSS. Those “scrollbars” will update its position while scrolling for visual feedback and will also respond if you click or drag them.

## Demo
[http://noeldelgado.github.io/gemini-scrollbar/](http://noeldelgado.github.io/gemini-scrollbar/)

## Dependencies
None

## Installation

**NPM**

```sh
npm i gemini-scrollbar --save
```

**Bower**

```sh
bower install gemini-scrollbar --save
```

## Usage

**JS**

```js
var GeminiScrollbar = require('gemini-scrollbar')

var myScrollbar = new GeminiScrollbar({
    element: document.querySelector('.my-scrollbar')
}).create();
```

**LESS**

```less
@import (inline) "<path-to-gemini-scrollbar>/gemini-scrollbar.css";
```

**CSS**

```css
@import url(<path-to-gemini-scrollbar>/gemini-scrollbar.css);
```

Or, you can add the relevant files in your document.

```html
<link href="<path-to-gemini-scrollbar>/gemini-scrollbar.css" rel="stylesheet">
<script src="<path-to-gemini-scrollbar>/index.js"></script>
```

## Options

name | type | default | description
:--- | :--- | :--- | :---
* **element** | HTMLElement | `null` | The element to apply scrollbars
autoshow | Boolean | `false` | Show scrollbars upon hovering
createElements | Boolean | `true` | Create and append the require HTMLElements at runtime.

\* `required`

## Basic Methods

name | description
:--- | :---
create | Bind the events, create the required elements and display the scrollbars.
update | Recalculate the viewbox and scrollbar dimensions.
destroy | Unbind the events and remove the custom scrollbar elements.

## Other Mehods

name | description
:-- | :--
getViewElement | Returns the scrollable element

## Customization

You can change the styles of the scrollbars using CSS. e.g:

```css
/* override gemini-scrollbar default styles */

/* vertical scrollbar track */
.gm-scrollbar.-vertical {
  background-color: #f0f0f0
}

/* horizontal scrollbar track */
.gm-scrollbar.-horizontal {
  background-color: transparent;
}

/* scrollbar thumb */
.gm-scrollbar .thumb {
  background-color: rebeccapurple;
}
.gm-scrollbar .thumb:hover {
  background-color: fuchsia;
}
```

## Notes

- **native overlay-scrollbar:** We check the scrollbar size before doing anything else [using this approach](http://davidwalsh.name/detect-scrollbar-width) by David Walsh. If the scrollbar size is equal to zero (which means the scrollbars are “over the content”) then we do nothing but add the `gm-prevented` class selector to the element, which contains the non-standard `-webkit-overflow-scrolling: touch;` declaration for web devices to use momentum-based scrolling and also helps “hidding” the gemini-scrollbar's elements using `display: none;` (beacause we are not going to use them anyway). No event binding, element creation... nothing, in this case we leave the OS/browser do its job. Why? you already have nice looking scrollbars for free.
- **::-webkit-scrollbar:** If you plan to use gemini-scrollbar on your application I highly recommend you removing any Webkit scrollbar styles you may have, why? using the `-webkit-` prefixed pseudo elements will cause Webkit turning off its build-in scrollbar rendering, interfering with our scrollbar-size-check. You can read a bit more about this issue on [this commit](../../issues/1).
- **create method:** The custom scrollbars will **not** render until you call the `create` method on the instance. i.e: `myScrollbar.create();`
- **required height:** To avoid unexpected results, it is recommended that you specify the `height` property with a value to the element you applying the custom scrollbars (or to its parent).
- **body tag:** If you want to apply custom scrollbars to `body`, make sure to declare a `height` value either to the `:root` pseudo-class or to the `html` element. e.g:

	```css
	html {
		height: 100%;
		/* or */
		height: 100vh;
		overflow: hidden;
	}
	```
- **createElements option:** The `createElements` option specify wheater or not gemini-scrollbar should create and append the require HTMLElements at runtime. Its default value is `true`. Passing this option as `false` will assume that you to have added the required markup with the specific CSS class selectors on them for it to work. i.e:

	```html
	<-- (createElements: false) example markup -->

	<div class="something-scrollable">
	  <div class="gm-scrollbar -vertical">
	    <div class="thumb"></div>
	  </div>
	  <div class="gm-scrollbar -horizontal">
	    <div class="thumb"></div>
	  </div>
	  <div class="gm-scroll-view">
	    All your content goes here.
	  </div>
	</div>
	```
This way you can be sure the library will not touch/modify your nodes structure. You can read more about the reason of this option [on this commit](https://github.com/noeldelgado/gemini-scrollbar/commit/2bb73c82f9d1588fb267fba08518adfe1170885c).

## License
MIT © [Noel Delgado](http://pixelia.me/)
