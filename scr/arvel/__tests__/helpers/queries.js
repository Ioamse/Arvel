import { Image } from 'react-native';
import { screen } from '@testing-library/react-native';

// <Image source={{ uri }}> по адресу картинки (UNSAFE_*ByProps сравнивает
// вложенные объекты по ссылке, поэтому source так не найти).
export function queryImage(uri) {
  return screen.UNSAFE_queryAllByType(Image).find((i) => i.props.source?.uri === uri) || null;
}

export function getImage(uri) {
  const img = queryImage(uri);
  if (!img) throw new Error(`Image with uri ${uri} not found`);
  return img;
}
