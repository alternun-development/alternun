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
exports.SkeletonLoader = SkeletonLoader;
exports.StatCardSkeleton = StatCardSkeleton;
exports.LedgerRowSkeleton = LedgerRowSkeleton;
exports.SectionHeaderSkeleton = SectionHeaderSkeleton;
exports.PillRowSkeleton = PillRowSkeleton;
var react_1 = __importStar(require("react"));
var react_native_1 = require("react-native");
var ThemeContext_1 = require("../theme/ThemeContext");
/**
 * Single shimmer skeleton block. Pulses between base and highlight colors
 * using the active theme's skeleton tokens — no external deps required.
 */
function SkeletonLoader(_a) {
    var width = _a.width, height = _a.height, _b = _a.borderRadius, borderRadius = _b === void 0 ? 8 : _b, style = _a.style;
    var theme = (0, ThemeContext_1.useTheme)().theme;
    var opacity = (0, react_1.useRef)(new react_native_1.Animated.Value(0)).current;
    (0, react_1.useEffect)(function () {
        var anim = react_native_1.Animated.loop(react_native_1.Animated.sequence([
            react_native_1.Animated.timing(opacity, {
                toValue: 1,
                duration: 700,
                useNativeDriver: true,
            }),
            react_native_1.Animated.timing(opacity, {
                toValue: 0,
                duration: 700,
                useNativeDriver: true,
            }),
        ]));
        anim.start();
        return function () { return anim.stop(); };
    }, [opacity]);
    var highlight = opacity.interpolate({
        inputRange: [0, 1],
        outputRange: [theme.skeletonBase, theme.skeletonHighlight],
    });
    return (<react_native_1.View style={[
            styles.wrapper,
            { width: width, height: height, borderRadius: borderRadius, backgroundColor: theme.skeletonBase },
            style,
        ]}>
      <react_native_1.Animated.View style={[react_native_1.StyleSheet.absoluteFillObject, { borderRadius: borderRadius, backgroundColor: highlight }]}/>
    </react_native_1.View>);
}
// ── Preset skeleton shapes ────────────────────────────────────────────────
/** Full skeleton for a StatCard (matches StatCard dimensions) */
function StatCardSkeleton() {
    var theme = (0, ThemeContext_1.useTheme)().theme;
    return (<react_native_1.View style={[
            styles.statCardSkeleton,
            { backgroundColor: theme.cardBg, borderColor: theme.cardBorder },
        ]}>
      <react_native_1.View style={styles.skeletonCardTop}>
        <SkeletonLoader width={32} height={32} borderRadius={8}/>
        <SkeletonLoader width={40} height={20} borderRadius={10}/>
      </react_native_1.View>
      <SkeletonLoader width={80} height={28} borderRadius={6} style={{ marginBottom: 6 }}/>
      <SkeletonLoader width={100} height={12} borderRadius={4}/>
    </react_native_1.View>);
}
/** Full skeleton for an AIRS ledger entry row */
function LedgerRowSkeleton() {
    return (<react_native_1.View style={styles.ledgerRow}>
      <SkeletonLoader width={36} height={36} borderRadius={10}/>
      <react_native_1.View style={styles.ledgerRowText}>
        <SkeletonLoader width={140} height={13} borderRadius={4} style={{ marginBottom: 6 }}/>
        <SkeletonLoader width={90} height={11} borderRadius={4}/>
      </react_native_1.View>
      <SkeletonLoader width={48} height={18} borderRadius={6}/>
    </react_native_1.View>);
}
/** Full skeleton for a section header */
function SectionHeaderSkeleton() {
    return (<react_native_1.View style={styles.sectionHeaderSkeleton}>
      <react_native_1.View>
        <SkeletonLoader width={120} height={16} borderRadius={4} style={{ marginBottom: 6 }}/>
        <SkeletonLoader width={80} height={12} borderRadius={4}/>
      </react_native_1.View>
      <SkeletonLoader width={60} height={28} borderRadius={14}/>
    </react_native_1.View>);
}
/** Skeleton for a pill/badge row (filter pills) */
function PillRowSkeleton(_a) {
    var _b = _a.count, count = _b === void 0 ? 4 : _b;
    return (<react_native_1.View style={styles.pillRow}>
      {Array.from({ length: count }).map(function (_, i) { return (<SkeletonLoader key={i} width={60 + i * 10} height={30} borderRadius={15}/>); })}
    </react_native_1.View>);
}
var styles = react_native_1.StyleSheet.create({
    wrapper: {
        overflow: 'hidden',
    },
    statCardSkeleton: {
        flex: 1,
        minWidth: '45%',
        borderWidth: 1,
        borderRadius: 20,
        padding: 16,
    },
    skeletonCardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    ledgerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 10,
    },
    ledgerRowText: {
        flex: 1,
    },
    sectionHeaderSkeleton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    pillRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
});
