/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { BoardViewer } from "../../../viewers/board/viewer";
import { KCViewerElement } from "../common/viewer";

export class KCBoardViewerElement extends KCViewerElement<BoardViewer> {
    protected override update_theme(): void {
        this.viewer.theme = this.themeObject.board;
    }

    protected override make_viewer(): BoardViewer {
        return new BoardViewer(
            this.canvas,
            !this.disableinteraction,
            this.themeObject.board,
        );
    }
}

window.customElements.define("kc-board-viewer", KCBoardViewerElement);
