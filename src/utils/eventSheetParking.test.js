import test from "node:test";
import assert from "node:assert/strict";
import { getParkingVehicleMessage } from "./eventSheetParking.js";

test("states the calculated number of band vehicles", () => {
  assert.equal(
    getParkingVehicleMessage(5),
    "The band will need parking for 5 vehicles (one per band member).",
  );
});

test("uses correct singular wording and a safe fallback", () => {
  assert.equal(
    getParkingVehicleMessage(1),
    "The band will need parking for 1 vehicle (one per band member).",
  );
  assert.equal(
    getParkingVehicleMessage(0),
    "Parking is required for all band vehicles.",
  );
});
