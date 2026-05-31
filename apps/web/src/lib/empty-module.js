// Empty module shim for react-native internal modules that have no web equivalent.
// Deep imports like react-native/Libraries/Utilities/codegenNativeComponent
// are native-only and should be no-ops on web.
//
// codegenNativeComponent is called as a function that returns a React component,
// so we export a function that returns a no-op component.

const NoOpComponent = () => null;

module.exports = () => NoOpComponent;
