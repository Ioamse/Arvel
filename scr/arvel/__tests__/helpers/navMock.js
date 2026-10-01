/* global jest */
// Подмена @react-navigation/native для изолированных тестов экранов:
// useNavigation() отдаёт тот же объект, что и проп navigation экрана,
// а useFocusEffect срабатывает как обычный эффект при монтировании.
//
//   jest.mock('@react-navigation/native', () => require('../helpers/navMock').module);
const React = require('react');

const ref = { current: null };

function createNavigation() {
  const parent = { navigate: jest.fn() };
  const listeners = {};
  const nav = {
    navigate: jest.fn(),
    goBack: jest.fn(),
    dispatch: jest.fn(),
    getParent: jest.fn(() => parent),
    addListener: jest.fn((event, cb) => {
      (listeners[event] ||= []).push(cb);
      return () => { listeners[event] = listeners[event].filter((x) => x !== cb); };
    }),
    // Имитация события навигатора, например beforeRemove при уходе назад.
    emit: (event, payload) => (listeners[event] || []).forEach((cb) => cb(payload)),
    parent,
  };
  ref.current = nav;
  return nav;
}

const actual = jest.requireActual('@react-navigation/native');

module.exports = {
  ref,
  createNavigation,
  module: {
    ...actual,
    useNavigation: () => ref.current,
    useFocusEffect: (cb) => React.useEffect(cb, [cb]),
  },
};
