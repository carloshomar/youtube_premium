/** Shared focus-effect mock using require() (Jest-safe). */
module.exports = {
  withFocusEffect(actual) {
    return {
      ...actual,
      useFocusEffect: (cb) => {
        const React = require('react');
        React.useEffect(() => {
          const cleanup = cb();
          return typeof cleanup === 'function' ? cleanup : undefined;
        }, [cb]);
      },
    };
  },
};
