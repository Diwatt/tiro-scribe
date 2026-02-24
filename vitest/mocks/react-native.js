// Minimal react-native shim for tests.  The goal is to provide just enough
// of the API surface that components can render without dragging in the real
// library (which contains Flow syntax and native code).  We export simple
// functional components that forward props so react-test-renderer produces a
// JSON tree instead of `null`.

const React = require('react');

function makeHostComponent(name) {
    return React.forwardRef(({ children, ...props }, ref) =>
        React.createElement(name, { ...props, ref }, children),
    );
}

module.exports = {
    Platform: {
        OS: 'ios',
        // `select` is used by RN components to choose platform-specific values.
        select: (obj) => (obj && obj.ios != null ? obj.ios : obj?.default),
    },
    View: makeHostComponent('View'),
    Text: makeHostComponent('Text'),
    StyleSheet: {
        create: (styles) => styles,
    },
    // add anything else as tests require (e.g. Animated nodes are mocked
    // separately via reanimated stub)
};