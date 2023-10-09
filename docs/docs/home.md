# KiCanvas

[KiCanvas] is an **interactive**, **browser-based** viewer for [KiCAD] schematics and boards. You can try it out for yourself at [kicanvas.org](https://kicanvas.org).

<video src="https://user-images.githubusercontent.com/250995/233475339-43c89a26-c825-4999-9d0a-7bde690c96ca.mp4" controls="true"></video>

!!! warning

    KiCanvas is currently in **early alpha**. There will be bugs and missing features. Please take a look at [known issues](#known-issues) and [file an issue] if you run into trouble.

You can also use KiCanvas on your own websites using the [embedding API](embedding.md). It's written in modern vanilla [TypeScript] and uses the [Canvas] element and [WebGL] for rendering. You can learn more on the [development page](development.md).

KiCanvas is developed by [Thea Flowers](https://thea.codes) with financial support from her [sponsors].

[KiCanvas]: http://kicanvas.org/home/
[KiCAD]: https://kicad.org
[file an issue]: https://github.com/theacodes/kicanvas/issues/new/choose
[TypeScript]: https://typescript.dev
[Canvas]: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API
[WebGL]: https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API
[Thea Flowers]: https://thea.codes
[sponsors]: https://github.com/sponsors/theacodes

## Known issues

In general, please check the [GitHub issues] page before filing new issues. Some high-level things that we known won't work:

-   Any KiCAD 5 files, KiCanvas can only parse files from KiCAD 6 and later.
-   Some KiCAD 7 features might not be fully implemented, such as custom fonts in schematics.
-   Browsers other than desktop Chrome, Firefox, and Safari may run into issues, as we aren't currently running automated tests against other browsers. We welcome issues related to browser compatibility, just make sure it hasn't already been reported.

[GitHub issues]: https://github.com/theacodes/kicanvas/issues

## FAQ

> Will you add this feature that's very important to me?

Maybe, maybe not. Check out our explicit non-goals in the [roadmap](#status-and-roadmap) section. Check the [GitHub issues] and see if the feature has already been requested. If not, feel free to create an issue and we'll talk about it. Please keep in mind that KiCanvas is intentionally limited in scope.

> Can I use KiCanvas on my own site?

Yes, but, it's all very early stages. See [embedding](embedding.md) for more details.

> Do I need to use a plugin to show my files in KiCanvas

Nope, not at all. KiCanvas reads KiCAD files directly.

> Are you going to support KiCAD 7 features? Custom fonts?

Yes. I'm actively working on bringing KiCanvas up to parity with KiCanvas 7, including custom fonts. For the time being, KiCAD 7 files should parse and load in KiCanvas, however, KiCanvas may not render some KiCAD 7 features correctly.

> Will KiCanvas support something like [InteractiveHtmlBom]?

Yes, KiCanvas will eventually let you view PCBs in "Assembly guide" mode. This won't require any extra KiCAD plugins or anything.

[InteractiveHtmlBom]: https://github.com/openscopeproject/InteractiveHtmlBom

> Why isn't KiCanvas on NPM?

Because KiCanvas's developer-facing APIs for embedding and parsing are not yet ready. I don't want to publish it only to immediately break users as I rapidly iterate and change things. These developer APIs are my next priority after getting rendering to a good state. Stay tuned.

> Why don't you support KiCAD 5 files?

KiCAD 5 files are a completely different format from V6 and onwards. Implementing parsers for that format would take a lot of time and I'm not interested in doing it.

> Why didn't you use [x] library/framework?

From the outset I wanted KiCanvas to be dependency-free. KiCanvas should not pull in any additional libraries that may interfere with the page its embedding on.

> Lol are you going to port all of KiCAD to the browser?

No, KiCanvas is explicitly read-only and due to that assumption being baked in it wouldn't serve as a good base for a browser-based editor.

> How can I help?

-   **Try it out**: Test out your projects, schematics, and boards with KiCanvas and report issues.
-   **Contribute code**: Since KiCanvas is still pretty early in its development, code contributions are harder to coordinate. Please file an issue or reach out before trying to contribute code, since I don't want you to waste your time.
-   **Sponsor**: This project is lead by a single person financially supported through [sponsors].

## Contributing

Contributions are welcome! However, since KiCanvas is in a super early stage please file an issue before you start working on something so we can coordinate. It's also recommended to take a moment and read over the [development documentation](development.md).

## License

KiCanvas is open source and published under the permissive MIT license. Please take a chance to read over the [license](license.md) for full details.

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
