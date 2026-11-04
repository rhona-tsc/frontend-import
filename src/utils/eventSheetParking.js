export const getParkingVehicleMessage = (vehicleCount) => {
  const count = Math.max(0, Math.trunc(Number(vehicleCount) || 0));

  if (!count) return "Parking is required for all band vehicles.";

  return `The band will need parking for ${count} ${count === 1 ? "vehicle" : "vehicles"} (one per band member).`;
};
