// Генерация набора значений размера из SizeSystemRule (GET /config →
// size_systems), см. openapi: сервер — источник истины, эти функции лишь
// материализуют закрытое множество для выбора в форме.

export function numericSizeValues(rule) {
  const values = [];
  for (let v = rule.min; v <= rule.max + 1e-9; v += rule.step) {
    // toFixed(1) убирает погрешность плавающей точки (38.499999...), а
    // Number(...).toString() затем убирает лишний ".0" у целых значений.
    values.push(Number(v.toFixed(1)).toString());
  }
  return values;
}

export function waistInseamValue(waist, inseam) {
  if (!waist || !inseam) return null;
  return `${waist}x${inseam}`;
}

export function rangeValues(min, max) {
  const values = [];
  for (let v = min; v <= max; v += 1) values.push(String(v));
  return values;
}
