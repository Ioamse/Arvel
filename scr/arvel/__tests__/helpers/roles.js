/* global describe, beforeEach */
// Роли из чек-листа. Разделы, которые у покупателя и продавца работают одним
// и тем же кодом, прогоняются под каждой ролью: верхний describe называется
// как группа в таблице («ПОКУПАТЕЛЬ» / «ПРОДАВЕЦ»), чтобы отчёт
// scripts/checklist-report.js сопоставил тесты с пунктами своей роли.
const { setAuth } = require('./mockContexts');

const BUYER = {
  group: 'ПОКУПАТЕЛЬ',
  user: { id: 'u1', name: 'Иван', display_name: 'Иван', phone: '+79990001122', role: 'user', is_admin: false },
};
const SELLER = {
  group: 'ПРОДАВЕЦ',
  user: { id: 's1', name: 'Алекс', display_name: 'Алекс', phone: '+79995550000', role: 'seller', is_admin: false },
};

// fn({ group, user, t }) — t(текстПокупателя, текстПродавца) выбирает
// формулировку пункта для текущей роли (в таблице они иногда различаются).
function forEachRole(fn) {
  describe.each([[BUYER.group, BUYER], [SELLER.group, SELLER]])('%s', (_group, role) => {
    beforeEach(() => { setAuth({ user: role.user }); });
    fn({ ...role, t: (buyerText, sellerText = buyerText) => (role === SELLER ? sellerText : buyerText) });
  });
}

module.exports = { BUYER, SELLER, forEachRole };
