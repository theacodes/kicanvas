/*
    Copyright (c) 2025 Xiang Yang.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/
export class BaseAPIError extends Error {
    constructor(
        public override name: string,
        public url: string,
        public description: string,
        public response?: Response,
    ) {
        super(`API Error: ${name}: ${url}: ${description}`);
    }
}

export class UnknownError extends BaseAPIError {
    constructor(url: string, description: string, response: Response) {
        super(`UnknownError`, url, description, response);
    }
}

export class NotFoundError extends BaseAPIError {
    constructor(url: string, response: Response) {
        super(`NotFoundError`, url, "not found", response);
    }
}

export class ForbiddenError extends BaseAPIError {
    constructor(url: string, response: Response) {
        super(`ForbiddenError`, url, "forbidden", response);
    }
}

export async function request_error_handler(response: Response) {
    switch (response.status) {
        case 200:
            return;
        case 403:
            throw new ForbiddenError(response.url, response);
        case 404:
            throw new NotFoundError(response.url, response);
        case 500:
            throw new UnknownError(
                response.url,
                await response.text(),
                response,
            );
    }
}
