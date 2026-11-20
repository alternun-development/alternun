import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Text, TextInput } from 'react-native';
import HonorAwardRedeemModal from '../HonorAwardRedeemModal';
import { HonorAwardRequestError } from '../../../utils/honorAwards';

jest.mock('../../i18n/useAppTranslation', () => ({
  useAppTranslation: () => ({ locale: 'es', t: (_key, _params, fallback) => fallback }),
}));

const texts = (tree) =>
  tree.root.findAllByType(Text).map((node) => [].concat(node.props.children).join(''));
const submitButton = (tree) =>
  tree.root.find(
    (node) =>
      typeof node.props.onPress === 'function' &&
      node.findAll((child) => child.type === Text && child.props.children === 'Reclamar').length > 0
  );

async function open(redeem) {
  const onRedeemed = jest.fn();
  const onClose = jest.fn();
  let tree;
  await act(async () => {
    tree = renderer.create(
      <HonorAwardRedeemModal visible redeem={redeem} onRedeemed={onRedeemed} onClose={onClose} />
    );
  });
  const type = async (value) =>
    act(async () => tree.root.findByType(TextInput).props.onChangeText(value));
  const submit = async () => act(async () => submitButton(tree).props.onPress());
  return { tree, onRedeemed, onClose, type, submit };
}

it('redeems the typed code and closes when the medal was given', async () => {
  const result = { recipeId: 'r', airsAmount: 5, reportStatus: 'released', grantId: 'g1' };
  const redeem = jest.fn(() => Promise.resolve(result));
  const view = await open(redeem);
  expect(submitButton(view.tree).props.disabled).toBe(true);
  await view.type('7k2m-qx9d-4hvt');
  await view.submit();
  expect(redeem).toHaveBeenCalledWith('7k2m-qx9d-4hvt');
  expect(view.onRedeemed).toHaveBeenCalledWith(result);
  expect(view.onClose).toHaveBeenCalled();
});

it('says when the medal and its Airs wait for an approver', async () => {
  const redeem = jest.fn(() =>
    Promise.resolve({
      recipeId: 'r',
      airsAmount: 14,
      reportStatus: 'pending_approval',
      grantId: null,
    })
  );
  const view = await open(redeem);
  await view.type('7K2M-QX9D-4HVT');
  await view.submit();
  expect(view.onClose).not.toHaveBeenCalled();
  expect(texts(view.tree)).toContain(
    'Código aceptado. Tu medalla y sus Airs quedaron en revisión: te avisaremos por correo cuando estén en tu perfil.'
  );
});

it.each([
  ['HONOR_CODE_INVALID', 'Ese código no existe. Revísalo e inténtalo de nuevo.'],
  ['HONOR_CODE_EXPIRED', 'Ese código ya venció.'],
  ['HONOR_CODE_EXHAUSTED', 'Ese código ya alcanzó su límite de usos.'],
  ['HONOR_CODE_ALREADY_REDEEMED', 'Ya usaste este código.'],
  [
    'HONOR_CODE_RATE_LIMITED',
    'Hiciste demasiados intentos. Espera 15 minutos e inténtalo de nuevo.',
  ],
  [
    'HONOR_CODE_ISSUER_INACTIVE',
    'Este código no se puede usar ahora. Escríbele al aliado que te lo compartió.',
  ],
  ['SOMETHING_ELSE', 'No pudimos reclamar la medalla. Inténtalo de nuevo.'],
])('explains %s', async (reason, message) => {
  const redeem = jest.fn(() => Promise.reject(new HonorAwardRequestError(409, reason)));
  const view = await open(redeem);
  await view.type('7K2M-QX9D-4HVT');
  await view.submit();
  expect(texts(view.tree)).toContain(message);
  expect(view.onRedeemed).not.toHaveBeenCalled();
});
