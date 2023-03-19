/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

/**
 * A class / object that cleans up its resources when dispose() is called.
 *
 * This is based on:
 * * https://github.com/tc39/proposal-explicit-resource-management
 * * https://github.com/dsherret/using_statement
 * * https://github.dev/microsoft/vscode/blob/main/src/vs/base/common/lifecycle.ts
 */
export interface IDisposable {
    dispose(): void;
}

/**
 * A collection of Disposable items that can be disposed of together.
 */
export class Disposables implements IDisposable {
    private _disposables: Set<IDisposable> = new Set();
    private _is_disposed: boolean = false;

    public add<T extends IDisposable>(item: T): T {
        if (this._is_disposed) {
            throw new Error(
                "Tried to add item to a DisposableStack that's already been disposed",
            );
        }
        this._disposables.add(item);

        return item;
    }

    public disposeAndRemove<T extends IDisposable>(item: T) {
        if (!item) {
            return;
        }

        item.dispose();
        this._disposables.delete(item);
    }

    public get isDisposed() {
        return this._is_disposed;
    }

    public dispose(): void {
        if (this._is_disposed) {
            console.trace("dispose() called on an already disposed resource");
            return;
        }
        for (const item of this._disposables.values()) {
            item.dispose();
        }
        this._disposables.clear();
        this._is_disposed = true;
    }
}
