import React from 'react';
import { View, StyleSheet } from 'react-native';

/**
 * A simple wrapper component that can be used in place of View
 * This will be enhanced later with network awareness functionality
 */
const NetworkAwareView = ({ children, style, ...props }) => {
  return (
    <View style={[styles.container, style]} {...props}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default NetworkAwareView;
