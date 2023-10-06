# Development

This page provides some technical background for those wishing to dig into KiCanvas's source code.

## Contributing

Contributions are welcome! However, since KiCanvas is in a super early stage please file an issue before you start working on something so we can coordinate. Also, please read our [Code of Conduct].

## Technical overview

KiCanvas is written in modern vanilla [TypeScript] and uses the [Canvas] element and [WebGL] for rendering. KiCanvas's user interface is built using [Web Components].

KiCanvas notably does not have any runtime dependencies. Everything it needs to work is bundled together and nothing pollutes the global namespace. This is critical to KiCanvas's goal of being easy to embed.

## Source code organization

KiCanvas's source code under `./src` is organized into the following:

-   `base` contains generic, widely applicable utilities for working with JavaScript, TypeScript, the DOM, and math. These are the sort of things you'd use across multiple, unrelated projects.
-   `kicad` contains the KiCAD data layer and text layout implementation. This is where parsers for KiCAD files and associated models live.
-   `graphics` contains the rendering engine. It is somewhat generic- it handles rendering primitives such as lines, circles, and polygons, but is also tailored to KiCanvas's needs in specific ways.
-   `viewers` contains classes that implement viewers for different KiCAD documents. Viewers handle creating geometry using "Painters" and managing "Layers" for the renderer to draw. Viewers do not provide a user interface on their own, they're designed with high-level APIs that let various user interface elements control the viewer.
-   `kc-ui` contains generic, low-level web components used to build KiCanvas's user interface. Elements in here are generic enough to be re-used in other projects, but may be slightly tailored to KiCanvas's needs. For example, `<kc-ui-button>` and `<kc-ui-icon>`.
-   `kicanvas` contains the KiCanvas application and its elements. Elements here implement KiCanvas functionality, such as `<kc-project-panel>` and `<kc-symbols-panel>`.

[KiCanvas]: https://kicanvas.org
[TypeScript]: https://typescript.dev
[Canvas]: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API
[WebGL]: https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API
[Web Components]: https://developer.mozilla.org/en-US/docs/Web/API/Web_components
[Code of Conduct]: https://github.com/theacodes/kicanvas/blob/main/CODE_OF_CONDUCT.md
