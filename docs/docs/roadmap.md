# Roadmap

KiCanvas is very early in its development and there's a ton of stuff that hasn't been done. The current top priority is parsing and rendering, while the next focus will be the embedding API.

Here's a non-exhaustive roadmap:

-   [x] Core functionality
    -   [x] kicad_sch parser
    -   [x] kicad_pcb parser
    -   [x] kicad_wks parser
    -   [x] kicad_pro parser
    -   [x] Rendering KiCAD 6 schematics
    -   [x] Rendering KiCAD 6 boards
    -   [x] Rendering KiCAD 6 text
    -   [x] Rendering worksheets
    -   [x] Loading hierarchical schematics
    -   [x] Rendering KiCAD 7 schematics
    -   [x] Rendering KiCAD 7 boards
    -   [x] Rendering KiCAD 7 text
    -   [ ] Rendering bitmap objects
    -   [ ] Rendering custom fonts
-   [ ] Viewer functionality
    -   [x] Pan/zoom
    -   [x] Zoom to page
    -   [x] Zoom to selection
    -   [x] Cursor position
    -   [x] Page information
    -   [x] Symbol selection
    -   [x] Footprint selection
    -   [x] Inspecting selected symbols and footprints
    -   [x] Footprint filtering
    -   [x] Symbol filtering
    -   [x] Board layer selection and visibility
    -   [x] Board net selection
    -   [x] Board net filtering
    -   [x] Board object visibility controls
    -   [ ] Board trace selection
    -   [ ] Board zone selection
    -   [ ] Copy selected item for pasting into KiCAD
    -   [x] Theming
    -   [ ] Onion view
-   [x] Standalone web application (kicanvas.org)
    -   [x] Project viewer
        -   [x] Loading files and projects from GitHub
        -   [x] Navigating hierarchical sheets
        -   [ ] BOM view
        -   [ ] Deep linking
    -   [ ] Symbol library browser
    -   [ ] Footprint library browser
    -   [ ] Assembly guide
    -   [ ] Mobile UI
-   [ ] Embedding API
    -   [x] Non-interactive document embedding
    -   [x] Interactive document embedding
    -   [ ] Fragment embedding
    -   [ ] Deep linking
    -   [ ] Footprint embedding
    -   [ ] Symbol embedding
    -   [ ] Assembly guide embedding
-   [ ] Integrations
    -   [ ] MkDocs/Python markdown integration
    -   [ ] Jupyter integration
    -   [ ] Sphinx integration
-   [ ] Browser compatibility
    -   [x] Chrome
    -   [x] Firefox
    -   [x] Safari
    -   [ ] Chrome (Android)
    -   [ ] Firefox mobile
    -   [ ] Safari mobile

## Non-goals

KiCanvas also has a list of specific non-goals. At this time, we won't be adding:

-   Editing of any kind - KiCanvas is read only and that assumption is baked deeply within the code.
-   Offline rendering
-   3D board and component rendering
-   Server-side usage
-   Comparison/visual diffing
-   Specific integrations with front-end frameworks (React, Vue, etc.) - KiCanvas is built using [Web Components] and should work out of the box with all web frameworks.

[Web Components]: https://developer.mozilla.org/en-US/docs/Web/API/Web_components
