# NPM Package Usage

This guide shows how to use KiCanvas as an NPM package in your projects.

## Installation

```bash
npm install kicanvas
```

## Usage Examples

## 🎯 Core KiCad File Parsing

```typescript
import { KicadPCB, KicadSch, ProjectSettings } from "kicanvas";

// Parse a KiCad PCB file
const pcb = KicadPCB.from_text(pcbFileContent);

// Parse a KiCad Schematic file
const schematic = KicadSch.from_text(schFileContent);

// Load project settings
const settings = ProjectSettings.from_text(proFileContent);
```

## 🎨 Graphics & Rendering

```typescript
import { Renderer, Polygon, Circle, Arc, Color, Vec2, BBox } from "kicanvas";

// Create graphics primitives
const circle = new Circle(new Vec2(10, 10), 5);
const color = new Color("#ff0000");
const bbox = new BBox(0, 0, 100, 100);
```

## 🖥️ Web Components (Auto-Registered)

```html
<!-- These work in HTML after importing kicanvas -->
<kc-kicanvas-shell></kc-kicanvas-shell>
<kc-kicanvas-embed src="path/to/file.kicad_pcb"></kc-kicanvas-embed>
```

```typescript
// Access components programmatically
import {
    KCBoardViewerElement,
    KCSchematicViewerElement,
    KCBoardAppElement,
} from "kicanvas";

const viewer = new KCBoardViewerElement();
```

## 📁 File System Integration

```typescript
import {
    VirtualFileSystem,
    FetchFileSystem,
    GitHubFileSystem,
    GitHub,
} from "kicanvas";

// Load files from URLs
const fs = new FetchFileSystem(["file1.kicad_pcb", "file2.kicad_sch"]);

// Load from GitHub
const github = new GitHub("owner", "repo");
const ghFs = new GitHubFileSystem(github, "main");
```

## 🔧 Project Management

```typescript
import { Project, Preferences } from "kicanvas";

const project = new Project();
const prefs = Preferences.INSTANCE;
```

## 🧮 Math Utilities

```typescript
import {
    Vec2,
    Matrix3,
    MathArc, // Note: renamed to avoid conflict with graphics Arc
    Angle,
    BBox,
} from "kicanvas";

const point = new Vec2(10, 20);
const transform = new Matrix3();
const angle = new Angle(45, "degrees");
```

## 🎭 Custom Elements & Base Classes

```typescript
import { CustomElement, KCUIElement } from "kicanvas";

// Extend base classes for custom components
class MyCustomViewer extends KCUIElement {
    // Your implementation
}
```

## 📱 Events

```typescript
import {
    KiCanvasLoadEvent,
    KiCanvasSelectEvent,
    KiCanvasMouseMoveEvent,
} from "kicanvas";

viewer.addEventListener("kicanvas:load", (event: KiCanvasLoadEvent) => {
    console.log("File loaded!", event.detail);
});
```

## 💡 TypeScript Support

**Full IntelliSense support:**

-   ✅ Auto-completion for all classes and methods
-   ✅ Type checking for parameters and return values
-   ✅ Documentation on hover
-   ✅ Error highlighting for invalid usage
-   ✅ Import suggestions

**Type-only imports:**

```typescript
import type { Theme, BoardTheme, IDisposable } from "kicanvas";
```
