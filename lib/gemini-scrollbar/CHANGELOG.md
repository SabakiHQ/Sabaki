## 1.2.4 (2015-05-13)

Bugfixes:

- getViewElement method returning null if the scroll bars were not created

## 1.2.3 (2015-04-29)

Features:

- Added `getViewElement` method that returns the scrollable element, useful if you want check its properties such as scrollHeight or add/remove content

## 1.1.3 (2015-04-08)

Bugfixes:

- OS X: showing custom scrollbars even when having overlayed ones natively [#1](https://github.com/noeldelgado/gemini-scrollbar/issues/1)
- Prevent error when loading the script on the `head` :/ [#2](https://github.com/noeldelgado/gemini-scrollbar/issues/2)

## 1.1.2 (2015-04-06)

Features:

- Safari support
  - added webkitTranslate for thumb position change

## 1.0.2 (2015-03-29)

Features:

- IE9 support
  - classList || className (add/remove class selectors)
  - style.transform || style.msTransform (update thumb position)
  - document.onstartselection prevented while draggin' the scrollbars

- Minor Bugfixes:

- `:active` state === `:hover` state by default for `.ms-scrollbar .thumb`
- thumb inherit `border-radius` from parent `ms-scrollbar` by default


## 1.0.1 (2015-03-28)

Bugfixes:

- `SCROLLBAR_WIDTH` value when `::-webkit-scrollbar` was present with an explicit `width`
- Force hiding the scrollbar elements when the custom-scrollbars were prevented


## 1.0.0 (2015-03-27)

Updates:

- :after pseudo element is not longer used to style the scrollbars. This
  makes the process of customization much more intuitive
