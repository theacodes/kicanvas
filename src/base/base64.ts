/*
    Copyright (c) 2025 Xiang Yang.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/
export class BaseDecodeError extends Error {
    constructor(message: string) {
        super(message);
    }
}

export function base64_decode(str: string): string {
    try {
        return atob(str);
    } catch (error) {
        throw new BaseDecodeError("Failed to decode base64 string: " + error);
    }
}
