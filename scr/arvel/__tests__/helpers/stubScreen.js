// Заглушка экрана для тестов навигации: рисует своё имя и пометку
// «[focused]», когда экран сейчас активен. Не падает без навигационного
// контекста (экран, который закрывается анимацией, рендерится уже без него).
const React = require('react');
const { Text } = require('react-native');
const { NavigationContext } = require('@react-navigation/native');

module.exports = function stubScreen(name) {
  function Stub() {
    const navigation = React.useContext(NavigationContext);
    const [focused, setFocused] = React.useState(() => !!navigation?.isFocused());
    React.useEffect(() => {
      if (!navigation) return undefined;
      setFocused(navigation.isFocused());
      const offFocus = navigation.addListener('focus', () => setFocused(true));
      const offBlur = navigation.addListener('blur', () => setFocused(false));
      return () => { offFocus(); offBlur(); };
    }, [navigation]);
    return React.createElement(Text, null, `${name}${focused ? ' [focused]' : ''}`);
  }
  Stub.displayName = name;
  return { __esModule: true, default: Stub };
};
