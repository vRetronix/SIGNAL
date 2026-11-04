Drop font files (.woff2 or .woff) here.
Then add them at the top of CSS/base.css, for example:

@font-face{font-family:"MyFont";src:url("../assets/fonts/MyFont.woff2") format("woff2");font-weight:400;font-display:swap}

and put "MyFont" first in --f-ui inside :root.
