import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';
import { useAuth } from '../context/AuthContext';
import FeedScreen from '../screens/FeedScreen';
import CatalogScreen from '../screens/CatalogScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import ChatScreen from '../screens/ChatScreen';
import AccountScreen from '../screens/AccountScreen';
import ProductScreen from '../screens/ProductScreen';
import ShopScreen from '../screens/ShopScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import HelpScreen from '../screens/HelpScreen';
import RulesScreen from '../screens/RulesScreen';
import AddProductScreen from '../screens/AddProductScreen';
import SearchScreen from '../screens/SearchScreen';
import OrdersScreen from '../screens/OrdersScreen';
import MyListingsScreen from '../screens/MyListingsScreen';
import AdminPanelScreen from '../screens/AdminPanelScreen';
import { HomeIcon, GridIcon, HeartIcon, ChatIcon, UserIcon } from '../components/Icons';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Более светлый серый для неактивных вкладок:
// стандартный textMuted (#8A8A8E) на чёрном фоне читается плохо.
const TAB_INACTIVE = '#B0B0B5';

function withProduct(ListComponent) {
  return function StackWrapper() {
    return (
      <Stack.Navigator
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}
      >
        <Stack.Screen name="List" component={ListComponent} />
        <Stack.Screen name="Product" component={ProductScreen} />
        <Stack.Screen name="Shop" component={ShopScreen} />
        <Stack.Screen name="AddProduct" component={AddProductScreen} />
        {/* ФИКС: экран поиска не был зарегистрирован — navigate('Search') не работал */}
        <Stack.Screen name="Search" component={SearchScreen} />
      </Stack.Navigator>
    );
  };
}

// У «Главной» отдельный стек (не через withProduct): колокольчик уведомлений
// открывает Notifications внутри ЭТОГО же стека, а не через переключение на
// вкладку «Профиль» — иначе «Назад» возвращал не на «Главную», а на «Профиль»
// (после переключения вкладки активной становится «Профиль», и goBack просто
// схлопывает её стек до AccountMain, а не переключает вкладку обратно).
function FeedStack() {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}
    >
      <Stack.Screen name="List" component={FeedScreen} />
      <Stack.Screen name="Product" component={ProductScreen} />
      <Stack.Screen name="Shop" component={ShopScreen} />
      <Stack.Screen name="AddProduct" component={AddProductScreen} />
      <Stack.Screen name="Search" component={SearchScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
    </Stack.Navigator>
  );
}

const CatalogStack = withProduct(CatalogScreen);
const FavoritesStack = withProduct(FavoritesScreen);

function ChatStack() {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}
    >
      <Stack.Screen name="ChatList" component={ChatScreen} />
    </Stack.Navigator>
  );
}

function AccountStack() {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}
    >
      <Stack.Screen name="AccountMain" component={AccountScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Help" component={HelpScreen} />
      <Stack.Screen name="Rules" component={RulesScreen} />
      <Stack.Screen name="AddProduct" component={AddProductScreen} />
      {/* Новые экраны раздела «Профиль» */}
      <Stack.Screen name="Orders" component={OrdersScreen} />
      <Stack.Screen name="MyListings" component={MyListingsScreen} />
      <Stack.Screen name="AdminPanel" component={AdminPanelScreen} />
      <Stack.Screen name="Product" component={ProductScreen} />
      <Stack.Screen name="Shop" component={ShopScreen} />
    </Stack.Navigator>
  );
}

function TabIcon({ Icon, focused, badge }) {
  const color = focused ? colors.accent : TAB_INACTIVE;
  return (
    <View style={{ width: 28, alignItems: 'center' }}>
      <Icon size={24} color={color} />
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function MainTabs() {
  const insets = useSafeAreaInsets();
  const { isLoggedIn } = useAuth();

  // Гость может листать каталог/ленту/избранное свободно, но «Чат» и
  // «Профиль» требуют входа — вместо переключения вкладки открываем модалку
  // авторизации (см. RootNavigator).
  const guardTab = ({ navigation }) => ({
    tabPress: (e) => {
      if (!isLoggedIn) {
        e.preventDefault();
        navigation.navigate('Auth');
      }
    },
  });

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        // ФИКС: при уходе с вкладки её стек сбрасывается на первый экран.
        // Иначе после перехода «колокольчик → уведомления» вкладка «Профиль»
        // навсегда открывалась сразу на уведомлениях.
        popToTopOnBlur: true,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          // 60 — под иконку и подпись, плюс реальный отступ безопасной
          // зоны устройства (home-индикатор на iPhone ≈ 34pt).
          height: 60 + insets.bottom,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 8),
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: TAB_INACTIVE,
        // 11px + без боковых отступов + без системного масштабирования,
        // чтобы «Избранное» помещалось целиком на узких вкладках
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 4 },
        tabBarAllowFontScaling: false,
        tabBarItemStyle: { paddingHorizontal: 0 },
      }}
    >
      <Tab.Screen
        name="Feed"
        component={FeedStack}
        options={{ title: 'Главная', tabBarIcon: ({ focused }) => <TabIcon Icon={HomeIcon} focused={focused} /> }}
      />
      <Tab.Screen
        name="Catalog"
        component={CatalogStack}
        options={{ title: 'Каталог', tabBarIcon: ({ focused }) => <TabIcon Icon={GridIcon} focused={focused} /> }}
      />
      <Tab.Screen
        name="Favorites"
        component={FavoritesStack}
        options={{ title: 'Избранное', tabBarIcon: ({ focused }) => <TabIcon Icon={HeartIcon} focused={focused} /> }}
        listeners={guardTab}
      />
      <Tab.Screen
        name="Chat"
        component={ChatStack}
        options={{ title: 'Чат', tabBarIcon: ({ focused }) => <TabIcon Icon={ChatIcon} focused={focused} badge={isLoggedIn ? '3' : undefined} /> }}
        listeners={guardTab}
      />
      <Tab.Screen
        name="Account"
        component={AccountStack}
        options={{ title: 'Профиль', tabBarIcon: ({ focused }) => <TabIcon Icon={UserIcon} focused={focused} /> }}
        listeners={guardTab}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute', top: -6, right: -2,
    minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5,
    backgroundColor: colors.danger,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
});