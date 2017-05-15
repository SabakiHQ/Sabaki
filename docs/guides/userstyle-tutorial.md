# Userstyle Tutorial

Some Go players are quite picky when it comes to stones and board textures. I'm not saying Sabaki's textures look the best or are realistic, but I daresay they're quite good. However, if you really have to, you can actually change them using userstyles.

Using userstyles is an easy way to change Sabaki's appearance without having to replace any important files and without having the changes reverted with the next update.

## Determine `styles.css` location

First, determine where Sabaki saves its settings:

* `%APPDATA%\Sabaki` on Windows
* `$XDG_CONFIG_HOME/Sabaki` or `~/.config/Sabaki` on Linux
* `~/Library/Application Support/Sabaki` on macOS

Inside the folder there's a file named `styles.css`. Any CSS statement inside this file will be loaded when Sabaki starts up. It can be helpful to [open the developer tools](debugging.md) to look at the DOM.

## Change stone images

Changing stone images is simply adding some CSS statements to the userstyle (overriding Sabaki's default styles):

~~~css
.goban li.sign_1 .stone img {
    background-image: url('black_stone.png');
}

.goban li.sign_-1 .stone img {
    background-image: url('white_stone.png');
}
~~~

Provide the image files and link to them using absolute paths or paths relative to `styles.css`.

### Random classes

Sabaki adds random classes `.random_{n}` where `n = 0,...,4` to `.goban li`. Say you have white shell stone images with different shell patterns. You can use the random classes to randomly assign a different pattern to each stone:

~~~css
.goban li.sign_-1.random_0 .stone img {
        background-image: url('white_stone_1.png');
    }
    .goban li.sign_-1.random_1 .stone img {
        background-image: url('white_stone_2.png');
    }
    .goban li.sign_-1.random_2 .stone img {
        background-image: url('white_stone_3.png');
    }
    .goban li.sign_-1.random_3 .stone img {
        background-image: url('white_stone_4.png');
    }
    .goban li.sign_-1.random_4 .stone img {
        background-image: url('white_stone_5.png');
}
~~~

## Change board texture

Changing board texture is a little bit more complicated since the image is applied to several elements:

~~~css
.goban,
.goban .row li .stone span::before,
.goban .row li .stone span::after,
.goban .row li.cross .stone span {
        background-color: #CB9838;
        background-image: url('board.jpg');
    }
    .goban .row li.triangle .stone span::after {
        border-bottom-color: #CB9838;
}
~~~

Also, choose a color (e.g. `#CB9838`) that closely resembles the board image to provide a fallback.
