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
exports.ProgressBar = ProgressBar;
var react_1 = __importStar(require("react"));
var react_native_1 = require("react-native");
var ThemeContext_1 = require("../theme/ThemeContext");
var spacing_1 = require("../tokens/spacing");
var colors_1 = require("../tokens/colors");
function ProgressBar(_a) {
    var progress = _a.progress, _b = _a.color, color = _b === void 0 ? colors_1.palette.teal : _b, _c = _a.height, height = _c === void 0 ? 8 : _c, _d = _a.showLabel, showLabel = _d === void 0 ? false : _d, label = _a.label, trailingLabel = _a.trailingLabel, _e = _a.animate, animate = _e === void 0 ? true : _e, style = _a.style;
    var theme = (0, ThemeContext_1.useTheme)().theme;
    var width = (0, react_1.useRef)(new react_native_1.Animated.Value(0)).current;
    var shimmer = (0, react_1.useRef)(new react_native_1.Animated.Value(0)).current;
    var clamped = Math.min(1, Math.max(0, progress));
    (0, react_1.useEffect)(function () {
        if (animate) {
            react_native_1.Animated.timing(width, {
                toValue: clamped,
                duration: 900,
                useNativeDriver: false,
            }).start();
        }
        else {
            width.setValue(clamped);
        }
    }, [clamped, animate, width]);
    // Shimmer loop on the fill
    (0, react_1.useEffect)(function () {
        var loop = react_native_1.Animated.loop(react_native_1.Animated.sequence([
            react_native_1.Animated.timing(shimmer, { toValue: 1, duration: 1200, useNativeDriver: true }),
            react_native_1.Animated.timing(shimmer, { toValue: 0, duration: 1200, useNativeDriver: true }),
        ]));
        loop.start();
        return function () { return loop.stop(); };
    }, [shimmer]);
    var shimmerOpacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });
    return (<react_native_1.View style={style}>
      {showLabel && (<react_native_1.View style={styles.labelRow}>
          {label ? <react_native_1.Text style={[styles.label, { color: theme.textSecondary }]}>{label}</react_native_1.Text> : null}
          {trailingLabel ? (<react_native_1.Text style={[styles.label, { color: theme.textMuted }]}>{trailingLabel}</react_native_1.Text>) : null}
        </react_native_1.View>)}

      <react_native_1.View style={[styles.track, { height: height, borderRadius: spacing_1.radius.full, backgroundColor: theme.skeletonBase }]}>
        <react_native_1.Animated.View style={[
            styles.fill,
            {
                height: height,
                borderRadius: spacing_1.radius.full,
                backgroundColor: color,
                opacity: shimmerOpacity,
                width: width.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                }),
            },
        ]}/>
      </react_native_1.View>

      <react_native_1.Text style={[styles.percent, { color: theme.textMuted }]}>
        {Math.round(clamped * 100)}%
      </react_native_1.Text>
    </react_native_1.View>);
}
var styles = react_native_1.StyleSheet.create({
    track: {
        width: '100%',
        overflow: 'hidden',
    },
    fill: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
    },
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    label: {
        fontSize: spacing_1.fontSize.sm,
        fontWeight: '500',
    },
    percent: {
        fontSize: spacing_1.fontSize.xs,
        marginTop: 4,
        textAlign: 'right',
    },
});
