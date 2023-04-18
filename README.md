# KiCanvas

[KiCanvas] is an **interactive**, **browser-based** viewer for [KiCAD] schematics and boards. You can try it out for yourself at https://kicanvas.org.

**NOTE**: KiCanvas is currently in **early alpha**. There will be bugs and missing features. Please take a look at [known issues](#known-issues) and [file an issue] if you run into trouble.

KiCanvas is written in modern vanilla [TypeScript] and uses the [Canvas] element and [WebGL] for rendering.

KiCanvas is developed by [Thea Flowers](https://thea.codes) with financial support from her [sponsors].

[KiCanvas]: https://kicanvas.org
[KiCAD]: https://kicad.org
[file an issue]: https://github.com/theacodes/kicanvas/issues/new
[TypeScript]: https://typescript.dev
[Canvas]: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API
[WebGL]: https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API
[Thea Flowers]: https://thea.codes
[sponsors]: https://sponsors.github.com/theacodes

## Status and roadmap

KiCanvas is very early in its development and there's a ton of stuff that hasn't been done. The current top priority is parsing and rendering, while the next focus will be the embedding API.

Here's a non-exhaustive roadmap:

- [x] Core functionality
    - [x] kicad_sch parser
    - [x] kicad_pcb parser
    - [x] kicad_wks parser
    - [x] kicad_pro parser
    - [x] Rendering KiCAD 6 schematics
    - [x] Rendering KiCAD 6 boards
    - [x] Rendering KiCAD 6 text
    - [x] Rendering worksheets
    - [x] Loading hierarchical schematics
    - [ ] Rendering KiCAD 7 schematics
    - [ ] Rendering KiCAD 7 boards
    - [ ] Rendering KiCAD 7 text
    - [ ] Rendering bitmap objects
- [ ] Viewer functionality
    - [x] Pan/zoom
    - [x] Zoom to page
    - [x] Zoom to selection
    - [x] Cursor position
    - [x] Page information
    - [x] Symbol selection
    - [x] Footprint selection
    - [x] Inspecting selected symbols and footprints
    - [x] Footprint filtering
    - [x] Symbol filtering
    - [x] Board layer selection and visibility
    - [x] Board net selection
    - [x] Board net filtering
    - [x] Board object visibility controls
    - [ ] Board trace selection
    - [ ] Board zone selection
    - [ ] Copy selected item for pasting into KiCAD
    - [ ] Theming
    - [ ] Onion view
- [x] Standalone web application (kicanvas.org)
    - [x] Project viewer
        - [x] Loading files and projects from GitHub
        - [x] Navigating hierarchical sheets
        - [ ] BOM view
        - [ ] Deep linking
    - [ ] Symbol library browser
    - [ ] Footprint library browser
    - [ ] Assembly guide
    - [ ] Mobile UI
- [ ] Embedding API
    - [ ] Non-interactive document embedding
    - [ ] Interactive document embedding
    - [ ] Fragment embedding
    - [ ] Deep linking
    - [ ] Footprint embedding
    - [ ] Symbol embedding
    - [ ] Assembly guide embedding
- [ ] Integrations
    - [ ] MkDocs/Python markdown integration
    - [ ] Jupyter integration
    - [ ] Sphinx integration
- [ ] Browser compatibility
    - [x] Chrome
    - [ ] Firefox
    - [ ] Safari
    - [ ] Chrome (Android)
    - [ ] Firefox mobile
    - [ ] Safari mobile

KiCanvas also has a list of specific non-goals. At this time, we won't be adding:

- Editing of any kind - KiCanvas is read only and that assumption is baked deeply within the code.
- Offline rendering
- 3D board and component rendering
- Server-side usage
- Comparison/visual diffing
- Specific integrations with front-end frameworks (React, Vue, etc.) - KiCanvas is built using Web Components and should work out of the box.

## Known issues

In general, please check the [GitHub issues] page before filing new issues. Some high-level things that we known won't work:

- Any KiCAD 5 files, KiCanvas can only parse files from KiCAD 6 and later.
- Many KiCAD 7 features, include text boxes, custom fonts in schematics, some new schematic shapes, etc. KiCAD 7 files should still parse and partially render.
- Browsers other than desktop Chrome may run into issues, as we aren't currently running automated tests against other browsers. We welcome issues related to browser compatibility, just make sure it hasn't already been reported.

[GitHub issues]: https://github.com/theacodes/kicanvas/issues

## FAQ

> Will you add this feature that's very important to me?

Maybe, maybe not. Check out our explicit non-goals in the [roadmap](#status-and-roadmap) section. Check the [GitHub issues] and see if the feature has already been requested. If not, feel free to create an issue and we'll talk about it. Please keep in mind that KiCanvas is intentionally limited in scope.

> Can I use KiCanvas on my own site?

Yes, but, KiCanvas's embedding API is not yet ready. Eventually we'll have a very nice developer experience and API for embedding. However, for the initial alpha release I wanted to focus on parsing and rendering. The embedding API is my next priority. You are welcome to integrate KiCanvas as-is, but know that it may be difficult and I can't really provide support until the embedding API is ready.

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

- **Try it out**: Test out your projects, schematics, and boards with KiCanvas and report issues.
- **Contribute code**: Since KiCanvas is still pretty early in its development, code contributions are harder to coordinate. Please file an issue or reach out before trying to contribute code, since I don't want you to waste your time.
- **Sponsor**: This project is lead by a single person financially supported through [sponsors].

## Technical overview

KiCanvas is written in modern vanilla [TypeScript] and uses the [Canvas] element and [WebGL] for rendering. KiCanvas's user interface is built using [Web Components].

KiCanvas notably does not have any runtime dependencies. Everything it needs to work is bundled together and nothing pollutes the global namespace. This is critical to KiCanvas's goal of being easy to embed.

The typical process of loading and displaying a KiCAD file is:

- The `Viewer` loads the file is by invoking the tokenizer and parser. This turns the file data into structured objects, typically with `KicadSch` or `KicadPCB` being the result.
- The `Viewer` prepares a set of graphical `Layers` that are used to hold the document's geometry and render it.
- The `Viewer` passes the document data and `Layers` to a `Painter`. The `Painter` handles walking through the document's items and generating geometry onto the `Layers` for each item. This process is only done once and done before any rendering occurs - geometry here is *retained*.
- The `Viewer` creates a `Viewport` and `Camera` for looking at the document.
- The `Viewer` submits the `Layers` and `Viewport` to the `Renderer` to actually draw the geometry onto the screen.
- The `Viewer` listens for events such as pan/zoom or selection and re-renders the `Layers` and `Viewport` as needed.

KiCanvas's source code under `./src` is organized into the following:

- `base` contains generic, widely applicable utilities for working with JavaScript, TypeScript, the DOM, and math. These are the sort of things you'd use across multiple, unrelated projects.
- `kicad` contains the KiCAD data layer and text layout implementation. This is where parsers for KiCAD files and associated models live.
- `graphics` contains the rendering engine. It is somewhat generic- it handles rendering primitives such as lines, circles, and polygons, but is also tailored to KiCanvas's needs in specific ways.
- `viewers` contains classes that implement viewers for different KiCAD documents. Viewers handle creating geometry using "Painters" and managing "Layers" for the renderer to draw. Viewers do not provide a user interface on their own, they're designed with high-level APIs that let various user interface elements control the viewer.
- `kc-ui` contains generic, low-level web components used to build KiCanvas's user interface. Elements in here are generic enough to be re-used in other projects, but may be slightly tailored to KiCanvas's needs. For example, `<kc-ui-button>` and `<kc-ui-icon>`.
- `kicanvas` contains the KiCanvas application and its elements. Elements here implement KiCanvas functionality, such as `<kc-project-panel>` and `<kc-symbols-panel>`.

[Web Components]: https://developer.mozilla.org/en-US/docs/Web/API/Web_components

## License and contributing

KiCanvas is open source! Please take a chance to read the [LICENSE](LICENSE.md) file.

Contributions are welcome! However, since KiCanvas is in a super early stage please file an issue before you start working on something so we can coordinate. Also, please read our [Code of Conduct](CODE_OF_CONDUCT.md).

## Special thanks

KiCanvas would not be possible without the incredible financial support of our [sponsors]. I'd specifically like to thank the following people for their support:

- [@mithro](https://github.com/mithro)
- [@jeremysf](https://github.com/jeremysf)
- [@blues](https://github.com/blues)
- [@bradanlane](https://github.com/bradanlane)
- [@timonsku](https://github.com/timonsku)
- [@todbot](https://github.com/todbot)
- [@friggeri](https://github.com/friggeri)
- [@voidmar](https://github.com/voidmar)
- [@casundra](https://github.com/casundra)
- [@ntpopgetdope](https://github.com/ntpopgetdope)
- [@ehughes](https://github.com/ehughes)
- [@guru](https://github.com/guru)
- [@jamesneal](https://github.com/jamesneal)
- [@calithameridi](https://github.com/calithameridi)
- [@jwr](https://github.com/jwr)
- [@forsyth](https://github.com/forsyth)
- [@mattimo](https://github.com/mattimo)
- [@mzollin](https://github.com/mzollin)

