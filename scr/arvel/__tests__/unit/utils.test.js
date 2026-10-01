import { currencySymbol, formatAmount, formatPrice, withCurrency } from '../../src/utils/price';
import { resolveMediaUrl } from '../../src/utils/media';
import { productUrl, APP_SCHEME, SHARE_BASE_URL } from '../../src/utils/links';
import { isImageBody, formatTime } from '../../src/utils/chatFormat';
import { guessContentType, toUploadAsset, prepareForUpload } from '../../src/utils/imageUpload';
import { API_BASE_URL } from '../../src/api/client';
import { ImageManipulator } from 'expo-image-manipulator';

// ru-RU разделяет разряды неразрывным пробелом — нормализуем для сравнения.
const norm = (s) => s.replace(/\s/g, ' ');

describe('utils/price', () => {
  it('currencySymbol: известные коды, неизвестный — как есть, пусто — пусто', () => {
    expect(currencySymbol('EUR')).toBe('€');
    expect(currencySymbol('RUB')).toBe('₽');
    expect(currencySymbol('CHF')).toBe('CHF');
    expect(currencySymbol(null)).toBe('');
  });

  it('formatAmount: разряды, дробь только если есть', () => {
    expect(norm(formatAmount(1200))).toBe('1 200');
    expect(norm(formatAmount(12.5))).toBe('12,50');
    expect(formatAmount(null)).toBe('—');
    expect(formatAmount('abc')).toBe('—');
  });

  it('formatPrice: минорные единицы -> основные, центы не теряются', () => {
    expect(norm(formatPrice(890000))).toBe('8 900');
    expect(formatPrice(1250)).toBe('12,50');
    expect(formatPrice(0)).toBe('0');
    expect(formatPrice(undefined)).toBe('—');
  });

  it('withCurrency: символ добавляется только когда есть валюта и сумма', () => {
    expect(withCurrency('100', 'EUR')).toBe('100 €');
    expect(withCurrency('100', null)).toBe('100');
    expect(withCurrency('—', 'EUR')).toBe('—');
  });
});

describe('utils/media', () => {
  it('достраивает относительный путь до полного адреса', () => {
    expect(resolveMediaUrl('/media/files/a.jpg')).toBe(`${API_BASE_URL}/media/files/a.jpg`);
  });
  it('абсолютные ссылки не трогает', () => {
    expect(resolveMediaUrl('https://cdn.example.com/a.jpg')).toBe('https://cdn.example.com/a.jpg');
    expect(resolveMediaUrl('HTTP://x/a.jpg')).toBe('HTTP://x/a.jpg');
  });
  it('пустое значение -> null', () => {
    expect(resolveMediaUrl('')).toBeNull();
    expect(resolveMediaUrl(undefined)).toBeNull();
  });
});

describe('utils/links', () => {
  it('ссылка на товар через схему приложения', () => {
    expect(APP_SCHEME).toBe('arvell');
    expect(SHARE_BASE_URL).toBe('arvell://');
    expect(productUrl('42')).toBe('arvell://product/42');
  });
});

describe('utils/chatFormat', () => {
  it('isImageBody узнаёт ссылки на картинки', () => {
    expect(isImageBody('/media/files/a.jpg')).toBe(true);
    expect(isImageBody('https://x.com/a.PNG?sig=1')).toBe(true);
    expect(isImageBody('  /media/b.webp  ')).toBe(true);
    expect(isImageBody('посмотри a.jpg')).toBe(false);
    expect(isImageBody('/media/files/doc.pdf')).toBe(false);
    expect(isImageBody(null)).toBe(false);
  });

  describe('formatTime', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2026, 8, 30, 15, 0, 0));
    });
    afterEach(() => jest.useRealTimers());

    it('первая минута — «сейчас»', () => {
      expect(formatTime(new Date(2026, 8, 30, 14, 59, 30).toISOString())).toBe('сейчас');
    });
    it('сегодня — часы и минуты', () => {
      expect(formatTime(new Date(2026, 8, 30, 9, 5).toISOString())).toBe('09:05');
    });
    it('вчера — «Вчера»', () => {
      expect(formatTime(new Date(2026, 8, 29, 23, 0).toISOString())).toBe('Вчера');
    });
    it('раньше — дата дд.мм', () => {
      expect(formatTime(new Date(2026, 8, 1, 12, 0).toISOString())).toBe('01.09');
    });
    it('пусто или мусор — пустая строка', () => {
      expect(formatTime(null)).toBe('');
      expect(formatTime('not a date')).toBe('');
    });
  });
});

describe('utils/imageUpload', () => {
  it('guessContentType: mimeType, иначе по расширению, по умолчанию jpeg', () => {
    expect(guessContentType({ uri: 'x', mimeType: 'image/heic' })).toBe('image/heic');
    expect(guessContentType({ uri: 'file:///a.PNG' })).toBe('image/png');
    expect(guessContentType({ uri: 'file:///a.webp?x=1' })).toBe('image/webp');
    expect(guessContentType({ uri: 'file:///a' })).toBe('image/jpeg');
  });

  it('toUploadAsset', () => {
    expect(toUploadAsset({ uri: 'file:///a.png', fileName: 'a.png' }))
      .toEqual({ uri: 'file:///a.png', contentType: 'image/png', filename: 'a.png' });
    expect(toUploadAsset({ uri: 'file:///a.jpg' }).filename).toBeNull();
  });

  describe('prepareForUpload', () => {
    // Мини-модель expo-image-manipulator: картинка заданного размера, каждое
    // сохранение даёт файл, размер которого зависит от качества сжатия.
    const setup = ({ width, height, sizeFor }) => {
      const resize = jest.fn();
      const saveAsync = jest.fn(async ({ compress }) => ({ uri: `file:///out-${compress}.jpg` }));
      const image = (w, h) => ({ width: w, height: h, saveAsync });
      ImageManipulator.manipulate.mockImplementation((src) => ({
        resize: (size) => { resize(size); return { renderAsync: async () => image(size.width, size.height) }; },
        renderAsync: async () => (typeof src === 'string' ? image(width, height) : src),
      }));
      global.fetch = jest.fn(async (uri) => ({ blob: async () => ({ size: sizeFor(uri) }) }));
      return { resize, saveAsync };
    };

    it('вписывает большую картинку в лимит с сохранением пропорций', async () => {
      const { resize } = setup({ width: 4000, height: 3000, sizeFor: () => 1000 });
      const out = await prepareForUpload({ uri: 'file:///big.heic', filename: 'big.heic' }, { maxWidth: 800, maxHeight: 800 });
      expect(resize).toHaveBeenCalledWith({ width: 800, height: 600 });
      expect(out).toEqual({ uri: 'file:///out-0.85.jpg', contentType: 'image/jpeg', filename: 'big.jpg' });
    });

    it('маленькую картинку не масштабирует', async () => {
      const { resize } = setup({ width: 300, height: 200, sizeFor: () => 1000 });
      await prepareForUpload({ uri: 'file:///s.jpg' });
      expect(resize).not.toHaveBeenCalled();
    });

    it('пережимает с понижением качества, пока файл не влезет в maxBytes', async () => {
      const sizes = { 0.85: 5000, 0.7: 3000, 0.55: 900 };
      const { saveAsync } = setup({
        width: 500, height: 500,
        sizeFor: (uri) => sizes[uri.match(/out-([\d.]+)\.jpg/)[1]],
      });
      const out = await prepareForUpload({ uri: 'file:///p.jpg' }, { maxBytes: 1000 });
      expect(saveAsync.mock.calls.map((c) => c[0].compress)).toEqual([0.85, 0.7, 0.55]);
      expect(out.uri).toBe('file:///out-0.55.jpg');
      expect(out.filename).toBe('photo.jpg');
    });
  });
});
