import { postcodes } from '../assets/assets';

const getCounty = (addressComponents) => {

    // ✅ Extract postcode (first part only)
    const postcodeComponent = addressComponents.find(component =>
        component.types.includes("postal_code")
    );

    if (!postcodeComponent) {
        console.warn("⚠️ No postcode found in address components.");
        return null;
    }

    const postcode = postcodeComponent.long_name.split(" ")[0].toUpperCase();

    // ✅ Find county in `postcodes`
    if (!Array.isArray(postcodes) || postcodes.length === 0) {
        console.error("❌ `postcodes` data is missing or incorrect.");
        return null;
    }

    const countyData = postcodes[0]; // The first object inside the array

    for (const [county, codes] of Object.entries(countyData)) {
        if (codes.includes(postcode)) {
            return county.charAt(0).toUpperCase() + county.slice(1); // Capitalize first letter
        }
    }

    console.warn("⚠️ No county found for postcode:", postcode);
    return null;
};

// ✅ Correct default export
export default getCounty;