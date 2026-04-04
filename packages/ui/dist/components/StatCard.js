"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatCard = StatCard;
var react_1 = __importDefault(require("react"));
var react_native_1 = require("react-native");
var ThemeContext_1 = require("../theme/ThemeContext");
var SkeletonLoader_1 = require("./SkeletonLoader");
var spacing_1 = require("../tokens/spacing");
function StatCard(_a) {
    var label = _a.label, value = _a.value, _b = _a.delta, delta = _b === void 0 ? '+0' : _b, _c = _a.deltaPositive, deltaPositive = _c === void 0 ? true : _c, accentColor = _a.accentColor, icon = _a.icon, _d = _a.isLoading, isLoading = _d === void 0 ? false : _d, style = _a.style;
    var theme = (0, ThemeContext_1.useTheme)().theme;
    if (isLoading) {
        return <SkeletonLoader_1.StatCardSkeleton />;
    }
    return (<react_native_1.View style={[
            styles.card,
            { backgroundColor: theme.cardBg, borderColor: theme.cardBorder },
            style,
        ]}>
      <react_native_1.View style={styles.cardTop}>
        <react_native_1.View style={[styles.iconBg, { backgroundColor: "".concat(accentColor, "18") }]}>
          {icon}
        </react_native_1.View>
        <react_native_1.View style={[
            styles.deltaBadge,
            deltaPositive ? styles.deltaPositive : styles.deltaNegative,
        ]}>
          <react_native_1.Text style={[
            styles.deltaText,
            { color: deltaPositive ? '#1ccba1' : '#ef4444' },
        ]}>
            {delta}
          </react_native_1.Text>
        </react_native_1.View>
      </react_native_1.View>

      <react_native_1.Text style={[styles.value, { color: theme.textPrimary }]}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </react_native_1.Text>
      <react_native_1.Text style={[styles.label, { color: theme.textMuted }]}>{label}</react_native_1.Text>
    </react_native_1.View>);
}
var styles = react_native_1.StyleSheet.create({
    card: {
        flex: 1,
        minWidth: '45%',
        borderWidth: 1,
        borderRadius: spacing_1.radius.xl,
        padding: spacing_1.spacing[4],
        shadowColor: '#00001e',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 14,
        elevation: 5,
    },
    cardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing_1.spacing[3],
    },
    iconBg: {
        width: 32,
        height: 32,
        borderRadius: spacing_1.radius.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    deltaBadge: {
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: spacing_1.radius.full,
    },
    deltaPositive: {
        backgroundColor: 'rgba(28,203,161,0.12)',
    },
    deltaNegative: {
        backgroundColor: 'rgba(239,68,68,0.12)',
    },
    deltaText: {
        fontSize: spacing_1.fontSize.xs,
        fontWeight: '600',
    },
    value: {
        fontSize: spacing_1.fontSize['3xl'],
        fontWeight: '700',
        marginBottom: 4,
        letterSpacing: -0.5,
    },
    label: {
        fontSize: spacing_1.fontSize.xs,
        fontWeight: '400',
    },
});
