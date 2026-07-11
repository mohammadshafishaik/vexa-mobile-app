/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('../src/navigation/RootNavigator', () => {
  const ReactMock = require('react');
  const { View } = require('react-native');

  return function MockRootNavigator() {
    return ReactMock.createElement(View, null);
  };
});

import App from '../App';

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
