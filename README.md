# KiCanvas

[KiCanvas] is an **interactive**, **browser-based** viewer for [KiCAD] schematics and boards. You can try it out for yourself at https://kicanvas.org.

https://user-images.githubusercontent.com/250995/233475339-43c89a26-c825-4999-9d0a-7bde690c96ca.mp4

**NOTE**: KiCanvas is currently in **early alpha**. There will be bugs and missing features. Please take a look at [known issues](#known-issues) and [file an issue] if you run into trouble.

You can also use KiCanvas on your own websites using the [embedding API]. It's written in modern vanilla [TypeScript] and uses the [Canvas] element and [WebGL] for rendering. You can learn more on the [development page](development.md).

KiCanvas is developed by [Thea Flowers](https://thea.codes) with financial support from her [sponsors].

[KiCanvas]: https://kicanvas.org
[KiCAD]: https://kicad.org
[file an issue]: https://github.com/theacodes/kicanvas/issues/new/choose
[embedding API]: https://kicanvas.org/embedding
[TypeScript]: https://typescript.dev
[Canvas]: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API
[WebGL]: https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API
[Thea Flowers]: https://thea.codes
[sponsors]: https://github.com/sponsors/theacodes

## Status and roadmap

KiCanvas is very early in its development and there's a ton of stuff that hasn't been done, there's a [roadmap] that you can use to get an idea of the overall status of the project.

[roadmap]: https://kicanvas.org/roadmap

## Known issues

In general, please check the [GitHub issues] page before filing new issues. Some high-level things that we known won't work:

-   Any KiCAD 5 files, KiCanvas can only parse files from KiCAD 6 and later.
-   Some KiCAD 7 features might not be fully implemented, such as custom fonts in schematics.
-   Browsers other than desktop Chrome, Firefox, and Safari may run into issues, as we aren't currently running automated tests against other browsers. We welcome issues related to browser compatibility, just make sure it hasn't already been reported.

[GitHub issues]: https://github.com/theacodes/kicanvas/issues

## FAQ

Take a look at our [FAQ] page for commonly asked questions and answers.

[FAQ]: https://kicanvas.org/faq

## License and contributing

KiCanvas is open source! Please take a chance to read the [LICENSE](LICENSE.md) file.

Contributions are welcome! However, since KiCanvas is in a super early stage please file an issue before you start working on something so we can coordinate. It's also recommended to take a moment and read over the [development documentation].

[development documentation]: https://kicanvas.org/development

## Special thanks

KiCanvas would not be possible without the incredible financial support of our [sponsors]. KiCanvas received significant support from the following individual and organizations:

-   [PartsBox](https://partsbox.com/)
-   [Blues](https://blues.io/)
-   [Tim Ansell](https://github.com/mithro)
-   [Jeremy Gordon](https://github.com/jeremysf)
-   [James Neal](https://github.com/jamesneal)

& donations and support from the following individuals:

-   [@timonsku](https://github.com/timonsku)
-   [@todbot](https://github.com/todbot)
-   [@friggeri](https://github.com/friggeri)
-   [@voidmar](https://github.com/voidmar)
-   [@casundra](https://github.com/casundra)
-   [@ntpopgetdope](https://github.com/ntpopgetdope)
-   [@ehughes](https://github.com/ehughes)
-   [@guru](https://github.com/guru)
-   [@jamesneal](https://github.com/jamesneal)
-   [@calithameridi](https://github.com/calithameridi)
-   [@forsyth](https://github.com/forsyth)
-   [@mattimo](https://github.com/mattimo)
-   [@mzollin](https://github.com/mzollin)
