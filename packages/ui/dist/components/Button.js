"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Button = Button;
var react_native_1 = require("react-native");
function Button(_a) {
    var title = _a.title, onPress = _a.onPress;
    return (<react_native_1.TouchableOpacity style={styles.button} onPress={onPress}>
      <react_native_1.Text style={styles.text}>{title}</react_native_1.Text>
    </react_native_1.TouchableOpacity>);
}
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
