"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatusPill = StatusPill;
exports.FilterPill = FilterPill;
exports.CountBadge = CountBadge;
var react_1 = __importDefault(require("react"));
var react_native_1 = require("react-native");
var ThemeContext_1 = require("../theme/ThemeContext");
var spacing_1 = require("../tokens/spacing");
var colors_1 = require("../tokens/colors");
// ── Status Pill ──────────────────────────────────────────────────────────────
var STATUS_PRESETS = {
    Free: { bg: 'rgba(28,203,161,0.14)', text: '#1ccba1', border: 'rgba(28,203,161,0.3)' },
    Deposited: { bg: 'rgba(245,158,11,0.14)', text: '#f59e0b', border: 'rgba(245,158,11,0.3)' },
    Consumed: { bg: 'rgba(248,113,113,0.14)', text: '#f87171', border: 'rgba(248,113,113,0.3)' },
    Open: { bg: 'rgba(28,203,161,0.14)', text: '#1ccba1', border: 'rgba(28,203,161,0.3)' },
    Closed: { bg: 'rgba(129,140,248,0.14)', text: '#818cf8', border: 'rgba(129,140,248,0.3)' },
    GOLD: { bg: 'rgba(212,185,106,0.14)', text: '#d4b96a', border: 'rgba(212,185,106,0.3)' },
    PLATINUM: { bg: 'rgba(155,169,196,0.14)', text: '#9ba9c4', border: 'rgba(155,169,196,0.3)' },
    SILVER: { bg: 'rgba(168,184,204,0.14)', text: '#a8b8cc', border: 'rgba(168,184,204,0.3)' },
};
function StatusPill(_a) {
    var _b;
    var status = _a.status, _c = _a.size, size = _c === void 0 ? 'md' : _c, style = _a.style;
    var preset = (_b = STATUS_PRESETS[status]) !== null && _b !== void 0 ? _b : {
        bg: 'rgba(255,255,255,0.08)',
        text: '#e8e8ff',
        border: 'rgba(255,255,255,0.15)',
    };
    return (<react_native_1.View style={[
            styles.statusPill,
            size === 'sm' && styles.statusPillSm,
            { backgroundColor: preset.bg, borderColor: preset.border },
            style,
        ]}>
      <react_native_1.Text style={[styles.statusText, size === 'sm' && styles.statusTextSm, { color: preset.text }]}>
        {status}
      </react_native_1.Text>
    </react_native_1.View>);
}
function FilterPill(_a) {
    var label = _a.label, active = _a.active, onPress = _a.onPress, style = _a.style;
    var theme = (0, ThemeContext_1.useTheme)().theme;
    return (<react_native_1.TouchableOpacity onPress={onPress} activeOpacity={0.75} style={[
            styles.filterPill,
            active
                ? { backgroundColor: theme.accent, borderColor: theme.accent }
                : { backgroundColor: theme.cardBg, borderColor: theme.cardBorder },
            style,
        ]}>
      <react_native_1.Text style={[
            styles.filterText,
            { color: active ? theme.accentText : theme.textSecondary },
        ]}>
        {label}
      </react_native_1.Text>
    </react_native_1.TouchableOpacity>);
}
function CountBadge(_a) {
    var count = _a.count, _b = _a.color, color = _b === void 0 ? colors_1.palette.teal : _b, style = _a.style, textStyle = _a.textStyle;
    return (<react_native_1.View style={[styles.countBadge, { backgroundColor: "".concat(color, "22"), borderColor: "".concat(color, "44") }, style]}>
      <react_native_1.Text style={[styles.countText, { color: color }, textStyle]}>{count}</react_native_1.Text>
    </react_native_1.View>);
}
var styles = react_native_1.StyleSheet.create({
    statusPill: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: spacing_1.radius.full,
        borderWidth: 1,
        alignSelf: 'flex-start',
    },
    statusPillSm: {
        paddingHorizontal: 7,
        paddingVertical: 2,
    },
    statusText: {
        fontSize: spacing_1.fontSize.sm,
        fontWeight: '600',
        letterSpacing: 0.2,
    },
    statusTextSm: {
        fontSize: spacing_1.fontSize.xs,
    },
    filterPill: {
        paddingHorizontal: spacing_1.spacing[3],
        paddingVertical: 7,
        borderRadius: spacing_1.radius.full,
        borderWidth: 1,
    },
    filterText: {
        fontSize: spacing_1.fontSize.sm,
        fontWeight: '500',
    },
    countBadge: {
        minWidth: 24,
        height: 24,
        borderRadius: spacing_1.radius.full,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
    },
    countText: {
        fontSize: spacing_1.fontSize.xs,
        fontWeight: '700',
    },
});
