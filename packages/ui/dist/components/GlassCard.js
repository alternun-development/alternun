"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlassCard = GlassCard;
exports.GlassChip = GlassChip;
var react_1 = __importDefault(require("react"));
var react_native_1 = require("react-native");
var ThemeContext_1 = require("../theme/ThemeContext");
var spacing_1 = require("../tokens/spacing");
var VARIANT_BORDERS = {
    default: 'rgba(255,255,255,0.10)',
    teal: 'rgba(28,203,161,0.28)',
    gold: 'rgba(212,185,106,0.28)',
    danger: 'rgba(248,113,113,0.28)',
};
var VARIANT_GLOW = {
    default: 'rgba(255,255,255,0.02)',
    teal: 'rgba(28,203,161,0.06)',
    gold: 'rgba(212,185,106,0.06)',
    danger: 'rgba(248,113,113,0.06)',
};
/**
 * Glass-morphism card surface.
 * On mobile we approximate the effect with semi-transparent background + border.
 * Wrap with expo-blur's BlurView in the consuming app for full glass effect.
 */
function GlassCard(_a) {
    var children = _a.children, _b = _a.variant, variant = _b === void 0 ? 'default' : _b, padding = _a.padding, style = _a.style;
    var theme = (0, ThemeContext_1.useTheme)().theme;
    return (<react_native_1.View style={[
            styles.card,
            {
                backgroundColor: theme.isDark
                    ? "rgba(13,13,31,0.88)"
                    : "rgba(255,255,255,0.88)",
                borderColor: VARIANT_BORDERS[variant],
                shadowColor: VARIANT_GLOW[variant],
                padding: padding !== null && padding !== void 0 ? padding : spacing_1.spacing[4],
            },
            style,
        ]}>
      {children}
    </react_native_1.View>);
}
/**
 * Compact inline glass surface — for status badges, chips, etc.
 */
function GlassChip(_a) {
    var children = _a.children, _b = _a.variant, variant = _b === void 0 ? 'default' : _b, style = _a.style;
    return (<react_native_1.View style={[
            styles.chip,
            { borderColor: VARIANT_BORDERS[variant], backgroundColor: VARIANT_GLOW[variant] },
            style,
        ]}>
      {children}
    </react_native_1.View>);
}
var styles = react_native_1.StyleSheet.create({
    card: {
        borderWidth: 1,
        borderRadius: spacing_1.radius['2xl'],
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.5,
        shadowRadius: 24,
        elevation: 6,
    },
    chip: {
        borderWidth: 1,
        borderRadius: spacing_1.radius.full,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
});
