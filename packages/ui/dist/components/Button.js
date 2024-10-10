"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Button = void 0;
var react_1 = __importDefault(require("react"));
var react_native_1 = require("react-native");
var Button = function (_a) {
    var title = _a.title, onPress = _a.onPress;
    return (<react_native_1.TouchableOpacity style={styles.button} onPress={onPress}>
      <react_native_1.Text style={styles.text}>{title}</react_native_1.Text>
    </react_native_1.TouchableOpacity>);
};
exports.Button = Button;
var styles = react_native_1.StyleSheet.create({
    button: {
        backgroundColor: '#007AFF',
        padding: 10,
        borderRadius: 5,
    },
    text: {
        color: 'white',
        textAlign: 'center',
        fontSize: 16,
    },
});
