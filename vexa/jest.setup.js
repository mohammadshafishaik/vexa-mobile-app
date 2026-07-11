/* eslint-env jest */

require('react-native-gesture-handler/jestSetup');

jest.mock('react-native-reanimated', () => {
	const React = require('react');
	const { View, Text } = require('react-native');

	const AnimatedView = React.forwardRef((props, ref) =>
		React.createElement(View, { ...props, ref }, props.children),
	);
	const AnimatedText = React.forwardRef((props, ref) =>
		React.createElement(Text, { ...props, ref }, props.children),
	);

	const animationBuilder = {
		duration: () => animationBuilder,
		springify: () => animationBuilder,
		damping: () => animationBuilder,
		stiffness: () => animationBuilder,
		mass: () => animationBuilder,
	};

	return {
		__esModule: true,
		default: {
			View: AnimatedView,
			Text: AnimatedText,
			createAnimatedComponent: (Component) => Component,
		},
		View: AnimatedView,
		Text: AnimatedText,
		FadeIn: animationBuilder,
		FadeInDown: animationBuilder,
		FadeOut: animationBuilder,
		SlideInDown: animationBuilder,
		SlideOutUp: animationBuilder,
		useSharedValue: (initialValue) => ({ value: initialValue }),
		useAnimatedStyle: (styleFactory) => styleFactory(),
		withTiming: (value) => value,
		withDelay: (_delay, value) => value,
		withSequence: (...values) => values[0],
		withSpring: (value) => value,
		withRepeat: (value) => value,
		Easing: {
			out: (fn) => fn,
			in: (fn) => fn,
			cubic: () => {},
			bezier: () => () => {},
		},
		runOnJS: (fn) => fn,
		interpolate: (_value, _inputRange, outputRange) => outputRange[0],
		interpolateColor: () => undefined,
	};
});

jest.mock('@react-navigation/native', () => {
	const React = require('react');

	return {
		NavigationContainer: ({ children }) => React.createElement(React.Fragment, null, children),
		useNavigation: () => ({
			reset: jest.fn(),
			navigate: jest.fn(),
			goBack: jest.fn(),
		}),
	};
});

jest.mock('@react-navigation/native-stack', () => ({
	createNativeStackNavigator: () => ({
		Navigator: ({ children }) => children,
		Screen: ({ children }) => children,
	}),
}));

jest.mock('@react-native-firebase/messaging', () => {
	return () => ({
		requestPermission: jest.fn(async () => 1),
		registerDeviceForRemoteMessages: jest.fn(async () => undefined),
		isDeviceRegisteredForRemoteMessages: true,
		getToken: jest.fn(async () => 'test-token'),
		onMessage: jest.fn(() => jest.fn()),
		setBackgroundMessageHandler: jest.fn(),
	});
});

jest.mock('@react-native-community/netinfo', () => ({
	useNetInfo: () => ({ isConnected: true }),
}));