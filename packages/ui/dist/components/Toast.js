"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Toast = Toast;
exports.ToastSystem = ToastSystem;
var react_1 = __importStar(require("react"));
var react_native_1 = require("react-native");
var spacing_1 = require("../tokens/spacing");
var colors_1 = require("../tokens/colors");
var TYPE_ACCENT = {
    success: colors_1.palette.teal,
    error: colors_1.palette.error,
    info: colors_1.palette.info,
    warning: colors_1.palette.warning,
};
function Toast(_a) {
    var item = _a.item, onDismiss = _a.onDismiss;
    var translateY = (0, react_1.useRef)(new react_native_1.Animated.Value(80)).current;
    var opacity = (0, react_1.useRef)(new react_native_1.Animated.Value(0)).current;
    (0, react_1.useEffect)(function () {
        react_native_1.Animated.parallel([
            react_native_1.Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
            react_native_1.Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        ]).start();
    }, [opacity, translateY]);
    function dismiss() {
        react_native_1.Animated.parallel([
            react_native_1.Animated.timing(translateY, { toValue: 80, duration: 180, useNativeDriver: true }),
            react_native_1.Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
        ]).start(function () { return onDismiss(item.id); });
    }
    var accent = TYPE_ACCENT[item.type];
    return (<react_native_1.Animated.View style={[styles.container, { opacity: opacity, transform: [{ translateY: translateY }] }]}>
      <react_native_1.TouchableOpacity onPress={dismiss} activeOpacity={0.85} style={styles.inner}>
        <react_native_1.View style={[styles.accent, { backgroundColor: accent }]}/>
        <react_native_1.View style={styles.body}>
          <react_native_1.Text style={styles.title}>{item.title}</react_native_1.Text>
          {item.message ? <react_native_1.Text style={styles.message}>{item.message}</react_native_1.Text> : null}
        </react_native_1.View>
      </react_native_1.TouchableOpacity>
    </react_native_1.Animated.View>);
}
function ToastSystem(_a) {
    var toasts = _a.toasts, onDismiss = _a.onDismiss;
    return (<react_native_1.View style={styles.system} pointerEvents="box-none">
      {toasts.map(function (t) { return (<Toast key={t.id} item={t} onDismiss={onDismiss}/>); })}
    </react_native_1.View>);
}
var styles = react_native_1.StyleSheet.create({
    system: {
        position: 'absolute',
        bottom: 32,
        left: spacing_1.spacing[4],
        right: spacing_1.spacing[4],
        gap: 8,
        zIndex: 9999,
    },
    container: {
        borderRadius: spacing_1.radius.lg,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 8,
    },
    inner: {
        flexDirection: 'row',
        backgroundColor: 'rgba(10,10,24,0.96)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        borderRadius: spacing_1.radius.lg,
        overflow: 'hidden',
    },
    accent: {
        width: 4,
    },
    body: {
        flex: 1,
        paddingHorizontal: spacing_1.spacing[3],
        paddingVertical: spacing_1.spacing[3],
    },
    title: {
        color: '#e8e8ff',
        fontSize: spacing_1.fontSize.base,
        fontWeight: '600',
    },
    message: {
        color: 'rgba(232,232,255,0.65)',
        fontSize: spacing_1.fontSize.sm,
        marginTop: 2,
    },
});
