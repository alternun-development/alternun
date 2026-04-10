export class AlternunAuthError extends Error {
    constructor(code, message, options = {}) {
        super(message);
        this.name = 'AlternunAuthError';
        this.code = code;
        this.cause = options.cause;
    }
}
export class AlternunConfigError extends AlternunAuthError {
    constructor(message, options = {}) {
        super('CONFIG_ERROR', message, options);
        this.name = 'AlternunConfigError';
    }
}
export class AlternunProviderError extends AlternunAuthError {
    constructor(message, options = {}) {
        super('PROVIDER_ERROR', message, options);
        this.name = 'AlternunProviderError';
    }
}
export class AlternunSessionError extends AlternunAuthError {
    constructor(message, options = {}) {
        super('SESSION_ERROR', message, options);
        this.name = 'AlternunSessionError';
    }
}
export function isAlternunAuthError(value) {
    return value instanceof AlternunAuthError;
}
export function toAlternunAuthError(error, fallbackCode = 'PROVIDER_ERROR', fallbackMessage = 'Unexpected auth error') {
    if (error instanceof AlternunAuthError) {
        return error;
    }
    if (error instanceof Error) {
        return new AlternunAuthError(fallbackCode, error.message || fallbackMessage, {
            cause: error,
        });
    }
    if (typeof error === 'string') {
        return new AlternunAuthError(fallbackCode, error || fallbackMessage);
    }
    return new AlternunAuthError(fallbackCode, fallbackMessage, { cause: error });
}
