# \<kicanvas-embed\>: The KiCanvas embedded viewer element

> ![IMPORTANT]
> **None of this is functional**. This is a proposed API to get feedback from users before implementation begins. The format is modeled after MDN's [HTML elements reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Element).

The `<kicanvas-embed>` HTML element embeds one or more KiCAD documents onto the page:

```html
<kicanvas-embed src="my-schematic.kicad_sch"></kicanvas-embed>
```

The above example shows the most basic usage of the `<kicanvas-embed>` element. It's usage is intentionally similar to the [`<video>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video) and [`<img>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img) elements. Through the use of additional [attributes](#attributes) you can control how the document is displayed, enable interactivity, and even load multiple files.

## Examples

### Interactivity

This example embeds a single document and enables basic controls- zoom, select, etc.:

```html
<kicanvas-embed
    src="my-schematic.kicad_sch"
    controls="basic">
</kicanvas-embed>
```

Using `controls="full"`, the viewer gains the sidebar and info panels:

```html
<kicanvas-embed
    src="my-schematic.kicad_sch"
    controls="all">
</kicanvas-embed>
```

You can disable specific panels using `panels`:

```html
<kicanvas-embed
    src="my-schematic.kicad_sch"
    controls="all"
    panels="nosettings">
</kicanvas-embed>
```

### Deep linking

This example shows that if you give the `<kicanvas-embed>` element an `id`, you can deep link into it using `#[id]:[reference]`:

```html
<kicanvas-embed
    id="my-schematic"
    src="my-schematic.kicad_sch"
    controls="basic">
</kicanvas-embed>

<a href="#my-schematic:Q101">Link to Q101</a>
```

### Multiple files

This example shows how to use `<kicanvas-source>` to load multiple files.

```html
<kicanvas-embed controls="all">
    <kicanvas-source src="project.kicad_prj"></kicanvas-source>
    <kicanvas-source src="schematic1.kicad_sch"></kicanvas-source>
    <kicanvas-source src="schematic2.kicad_sch"></kicanvas-source>
    <kicanvas-source src="board.kicad_pcb"></kicanvas-source>
</kicanvas-embed>
```

Note that if the files are all part of the same project, then the root schematic will be shown by default. If they are unrelated, the first schematic will be shown.

### Inline source

This example shows how to use `<kicanvas-source>` along with inline KiCAD data. In this case, it's a symbol copied from a schematic and pasted into the HTML source:

```html
<kicanvas-embed>
    <kicanvas-source type="schematic">
      (lib_symbols
        (symbol "power:+12V" (power) (pin_names (offset 0)) (in_bom yes) (on_board yes)
          (property "Reference" "#PWR" (at 0 -3.81 0)
            (effects (font (size 1.27 1.27)) hide)
          )
          ...
    </kicanvas-source>
</kicanvas-embed>
```

## Attributes

- `controls` - determines if the document is interactive (pan, zoom, etc.) and which controls are available
  - `none` - document is not interactive and behaves like an `<img>` (default)
  - `basic` - zoom, pan, and select are available.
  - `full` - complete interactive viewer, including side panels.
- `controlslist` - further customizes the available controls.
  - `nofullscreen` - don't show the fullscreen button.
  - `nodownload` - don't show the download button.
  - `download` - show the download button when used with controls="none".
  - `nosymbols` - don't show the schematic symbols panel.
  - `nofootprints` - don't show the board footprints panel.
  - `noobjects` - don't show the board objects panel.
  - `noproperties` - don't show the selection properties panel.
  - `noinfo` - don't show the document info panel.
  - `nopreferences` - don't show the user preferences panel.
  - `nohelp` - don't show the help panel.
- `height` - the height of the viewer's display area, in [CSS pixels](https://drafts.csswg.org/css-values/#px) (absolute values only; [no percentages](https://html.spec.whatwg.org/multipage/embedded-content.html#dimension-attributes))
- `src` - the URL of the document to embed. If you want to show multiple documents within a single viewer, you can use multiple child `<kicanvas-source>` elements.
- `theme` - sets the color theme to use, valid values are `kicad` and `witchhazel`
- `zoom` - sets the initial view into the document
  - `objects` - zooms to show all visible objects (default)
  - `page` - zooms to show the entire page
  - `x y w h` - zooms to the given area, similar to the SVG `viewBox` attribute. For example, `10 10 100 100`.
  - `<list of references>` - zooms to include the given symbols or footprints. For example `C101 D101 Q101`.
- `width` - the width of the viewer's display area, in [CSS pixels](https://drafts.csswg.org/css-values/#px) (absolute values only; [no percentages](https://html.spec.whatwg.org/multipage/embedded-content.html#dimension-attributes))

## Events

| Event Name | Fired When |
| ---------- | -----------|
| `kicanvas:click` | The user clicks or taps within the embedded document |
| `kicanvas:documentchange` | The currently displayed document is changed, either through user interaction or programmatically. |
| `kicanvas:error` | An error occurs while loading source files |
| `kicanvas:load` | All sources files have been successfully loaded |
| `kicanvas:loadstart` | KiCanvas begins loading source files |
| `kicanvas:select` | The user selects (or deselects) an object within the document |
