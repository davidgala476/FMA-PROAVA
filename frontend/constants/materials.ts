export const MATERIALS = [
  { label: 'Hierro', value: 'iron' },
  { label: 'Acero', value: 'steel' },
  { label: 'Carbono', value: 'carbon' },
  { label: 'Diamante', value: 'diamond' },
  { label: 'Agua', value: 'water' },
  { label: 'Hielo', value: 'ice' },
  { label: 'Oro', value: 'gold' },
  { label: 'Plata', value: 'silver' },
  { label: 'Cobre', value: 'copper' },
  { label: 'Piedra', value: 'stone' }
];
export const valueToLabel = (value: string) => {
  const found = MATERIALS.find(m => m.value === value);
  return found ? found.label : value;
};
export default MATERIALS;