export const parkingDataEventName = 'parking-data-changed';

export const emitParkingDataChanged = (detail = {}) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(parkingDataEventName, { detail }));
};

export const onParkingDataChanged = (handler) => {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(parkingDataEventName, handler);
  return () => window.removeEventListener(parkingDataEventName, handler);
};

