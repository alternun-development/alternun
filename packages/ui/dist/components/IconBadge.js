"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IconBadge = IconBadge;
var react_1 = __importDefault(require("react"));
var react_native_1 = require("react-native");
var spacing_1 = require("../tokens/spacing");
var SIZE_MAP = {
    sm: { container: 28, borderRadius: spacing_1.radius.sm },
    md: { container: 36, borderRadius: spacing_1.radius.md },
    lg: { container: 48, borderRadius: spacing_1.radius.lg },
};
/**
 * Colored icon container — the translucent circle/square behind icons.
 * Tint is automatically derived from the accent color (18% opacity).
 */
function IconBadge(_a) {
    var icon = _a.icon, color = _a.color, _b = _a.size, size = _b === void 0 ? 'md' : _b, style = _a.style;
    var _c = SIZE_MAP[size], container = _c.container, borderRadius = _c.borderRadius;
    return (<react_native_1.View style={[
            styles.container,
            {
                width: container,
                height: container,
                borderRadius: borderRadius,
                backgroundColor: "".concat(color, "20"),
                borderColor: "".concat(color, "30"),
            },
            style,
        ]}>
      {icon}
    </react_native_1.View>);
}
var styles = react_native_1.StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
});
