export const AUTH_CALLBACK_QUERY_KEYS = [
    'access_token',
    'refresh_token',
    'expires_at',
    'expires_in',
    'token_type',
    'type',
    'error',
    'error_code',
    'error_description',
    'code',
];
function readSearchParam(searchParams, key) {
    const value = searchParams.get(key);
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}
export function readWebAuthCallbackPayload(searchValue, hashValue) {
    const normalizedHash = hashValue.startsWith('#') ? hashValue.slice(1) : hashValue;
    const hashParams = new URLSearchParams(normalizedHash);
    const queryParams = new URLSearchParams(searchValue);
    const readParam = (key) => { var _a; return (_a = readSearchParam(hashParams, key)) !== null && _a !== void 0 ? _a : readSearchParam(queryParams, key); };
    const accessToken = readParam('access_token');
    const refreshToken = readParam('refresh_token');
    const callbackType = readParam('type');
    const callbackError = readParam('error');
    const callbackErrorDescription = readParam('error_description');
    const callbackErrorCode = readParam('error_code');
    return {
        accessToken,
        refreshToken,
        callbackType,
        callbackError,
        callbackErrorDescription,
        callbackErrorCode,
        hasPayload: [
            accessToken,
            refreshToken,
            callbackType,
            callbackError,
            callbackErrorDescription,
            callbackErrorCode,
        ].some((value) => { var _a; return Boolean(((_a = value === null || value === void 0 ? void 0 : value.length) !== null && _a !== void 0 ? _a : 0) > 0); }),
    };
}
export function stripAuthCallbackTokensFromUrl(urlValue, runtimeWindow) {
    var _a;
    const parsedUrl = new URL(urlValue);
    const searchParams = new URLSearchParams(parsedUrl.search);
    for (const key of AUTH_CALLBACK_QUERY_KEYS) {
        searchParams.delete(key);
    }
    const nextSearch = searchParams.toString();
    const nextPath = `${parsedUrl.pathname}${nextSearch ? `?${nextSearch}` : ''}`;
    const activeWindow = runtimeWindow !== null && runtimeWindow !== void 0 ? runtimeWindow : (typeof window === 'undefined' ? undefined : window);
    if ((_a = activeWindow === null || activeWindow === void 0 ? void 0 : activeWindow.history) === null || _a === void 0 ? void 0 : _a.replaceState) {
        activeWindow.history.replaceState({}, '', nextPath);
    }
}
