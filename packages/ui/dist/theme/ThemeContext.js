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
exports.ThemeProvider = ThemeProvider;
exports.useTheme = useTheme;
var react_1 = __importStar(require("react"));
var themes_1 = require("./themes");
var ThemeContext = (0, react_1.createContext)({
    theme: themes_1.darkTheme,
    isDark: true,
    toggleTheme: function () { },
});
function ThemeProvider(_a) {
    var children = _a.children, _b = _a.mode, mode = _b === void 0 ? 'dark' : _b, onToggle = _a.onToggle;
    var theme = mode === 'dark' ? themes_1.darkTheme : themes_1.lightTheme;
    return (<ThemeContext.Provider value={{ theme: theme, isDark: mode === 'dark', toggleTheme: onToggle !== null && onToggle !== void 0 ? onToggle : (function () { }) }}>
      {children}
    </ThemeContext.Provider>);
}
function useTheme() {
    return (0, react_1.useContext)(ThemeContext);
}
