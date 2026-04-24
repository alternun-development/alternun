import { buildAuthentikRelayRoute, shouldUseAuthentikRelayEntry } from './authEntry.js';
import { clearPendingAuthentikOAuthProvider, readPendingAuthentikOAuthProvider, } from './authentikClient.js';
import { nativeSignIn, resolveAuthRuntime, webRedirectSignIn } from './runtimeSignIn.js';
function resolveRuntime(dependencies) {
    var _a, _b;
    return (_b = (_a = dependencies === null || dependencies === void 0 ? void 0 : dependencies.resolveRuntime) === null || _a === void 0 ? void 0 : _a.call(dependencies)) !== null && _b !== void 0 ? _b : resolveAuthRuntime();
}
function resolveRelayEntryMode(dependencies) {
    var _a, _b;
    return (_b = (_a = dependencies === null || dependencies === void 0 ? void 0 : dependencies.shouldUseRelayEntry) === null || _a === void 0 ? void 0 : _a.call(dependencies)) !== null && _b !== void 0 ? _b : shouldUseAuthentikRelayEntry();
}
export async function startSocialSignIn({ client, provider, authentikProviderHint, redirectTo, forceFreshSession = false, strategy, onRelayRoute, dependencies, }) {
    var _a, _b;
    const runtime = resolveRuntime(dependencies);
    const shouldUseRelayEntry = resolveRelayEntryMode(dependencies);
    const normalizedRedirectTo = typeof redirectTo === 'string' && redirectTo.trim().length > 0 ? redirectTo.trim() : undefined;
    if (runtime === 'web' && shouldUseRelayEntry) {
        if (!onRelayRoute) {
            throw new Error('CONFIG_ERROR: startSocialSignIn requires onRelayRoute when relay entry is enabled');
        }
        await onRelayRoute(buildAuthentikRelayRoute(authentikProviderHint, {
            next: normalizedRedirectTo,
            forceFreshSession,
        }));
        return 'relay';
    }
    if (runtime === 'web') {
        return ((_a = dependencies === null || dependencies === void 0 ? void 0 : dependencies.webRedirectSignIn) !== null && _a !== void 0 ? _a : webRedirectSignIn)({
            client,
            provider,
            authentikProviderHint,
            redirectTo: normalizedRedirectTo,
            forceFreshSession,
            strategy,
        });
    }
    await ((_b = dependencies === null || dependencies === void 0 ? void 0 : dependencies.nativeSignIn) !== null && _b !== void 0 ? _b : nativeSignIn)({
        client,
        provider,
    });
    return 'native';
}
export async function resumePendingSocialSignIn({ client, redirectTo, forceFreshSession = false, strategy, onRelayRoute, dependencies, resolveProvider, readPendingProvider = readPendingAuthentikOAuthProvider, clearPendingProvider = clearPendingAuthentikOAuthProvider, }) {
    var _a;
    const pendingProvider = readPendingProvider();
    if (pendingProvider !== 'google' && pendingProvider !== 'discord') {
        return null;
    }
    clearPendingProvider();
    return startSocialSignIn({
        client,
        provider: (_a = resolveProvider === null || resolveProvider === void 0 ? void 0 : resolveProvider(pendingProvider)) !== null && _a !== void 0 ? _a : pendingProvider,
        authentikProviderHint: pendingProvider,
        redirectTo,
        forceFreshSession,
        strategy,
        onRelayRoute,
        dependencies,
    });
}
