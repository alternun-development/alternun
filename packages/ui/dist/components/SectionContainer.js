"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SectionContainer = SectionContainer;
var react_1 = __importDefault(require("react"));
var react_native_1 = require("react-native");
var ThemeContext_1 = require("../theme/ThemeContext");
var SkeletonLoader_1 = require("./SkeletonLoader");
var spacing_1 = require("../tokens/spacing");
function SectionContainer(_a) {
    var title = _a.title, subtitle = _a.subtitle, trailing = _a.trailing, children = _a.children, _b = _a.isLoading, isLoading = _b === void 0 ? false : _b, style = _a.style, contentStyle = _a.contentStyle;
    var theme = (0, ThemeContext_1.useTheme)().theme;
    return (<react_native_1.View style={[
            styles.section,
            { backgroundColor: theme.cardBg, borderColor: theme.cardBorder },
            style,
        ]}>
      {isLoading ? (<SkeletonLoader_1.SectionHeaderSkeleton />) : (<react_native_1.View style={styles.header}>
          <react_native_1.View style={styles.headerText}>
            <react_native_1.Text style={[styles.title, { color: theme.textPrimary }]}>{title}</react_native_1.Text>
            {subtitle ? (<react_native_1.Text style={[styles.subtitle, { color: theme.textMuted }]}>{subtitle}</react_native_1.Text>) : null}
          </react_native_1.View>
          {trailing}
        </react_native_1.View>)}

      <react_native_1.View style={contentStyle}>{children}</react_native_1.View>
    </react_native_1.View>);
}
var styles = react_native_1.StyleSheet.create({
    section: {
        marginHorizontal: spacing_1.spacing[4],
        marginBottom: spacing_1.spacing[4],
        borderRadius: spacing_1.radius['2xl'],
        borderWidth: 1,
        padding: spacing_1.spacing[4],
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 4,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing_1.spacing[4],
    },
    headerText: {
        flex: 1,
    },
    title: {
        fontSize: spacing_1.fontSize.lg,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    subtitle: {
        fontSize: spacing_1.fontSize.sm,
        fontWeight: '400',
        marginTop: 2,
    },
});
