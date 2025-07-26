/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

// Side effects - Register web components globally
import "./base/livereload";
import "./kicanvas/elements/kicanvas-shell";
import "./kicanvas/elements/kicanvas-embed";

// ========================================
// Core KiCad File Parsers & Types
// ========================================
export * from "./kicad";

// ========================================
// Graphics & Rendering
// ========================================
export * from "./graphics";
export * from "./viewers/base/viewer";
export * from "./viewers/board/viewer";
export * from "./viewers/schematic/viewer";

// ========================================
// File System & Services
// ========================================
export { VirtualFileSystem, FetchFileSystem } from "./kicanvas/services/vfs";
export { GitHubFileSystem } from "./kicanvas/services/github-vfs";
export { GitHub } from "./kicanvas/services/github";

// ========================================
// Project Management
// ========================================
export { Project } from "./kicanvas/project";
export { Preferences } from "./kicanvas/preferences";

// ========================================
// Math & Utilities
// ========================================
export { Angle } from "./base/math/angle";
export { Arc as MathArc } from "./base/math/arc";
export { BBox } from "./base/math/bbox";
export { Camera2 } from "./base/math/camera2";
export { Matrix3 } from "./base/math/matrix3";
export { Vec2 } from "./base/math/vec2";
export { Color } from "./base/color";
export { Logger } from "./base/log";

// ========================================
// Web Components Base Classes
// ========================================
export { CustomElement } from "./base/web-components/custom-element";
export { KCUIElement } from "./kc-ui/element";

// ========================================
// Main UI Components (already registered globally)
// ========================================
export { KCBoardAppElement } from "./kicanvas/elements/kc-board/app";
export { KCSchematicAppElement } from "./kicanvas/elements/kc-schematic/app";
export { KCBoardViewerElement } from "./kicanvas/elements/kc-board/viewer";
export { KCSchematicViewerElement } from "./kicanvas/elements/kc-schematic/viewer";

// ========================================
// Events
// ========================================
export * from "./viewers/base/events";

// ========================================
// Re-export commonly used types for convenience
// ========================================
export type { IDisposable } from "./base/disposable";
export type { Theme, BoardTheme, SchematicTheme } from "./kicad/theme";
