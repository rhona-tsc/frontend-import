import React, { useContext, useDeferredValue } from "react";
import { ShopContext } from "../context/ShopContext";
import Title from "./Title";
import ActItem from "./ActItem";

const DBG = false;
const log = (...a) => DBG && console.log("🆕[NewActs]", ...a);



const Acts = () => {
  const { actCards } = useContext(ShopContext); // use cards as on Home
  const cards = useDeferredValue(Array.isArray(actCards) ? actCards : []);



  return (
    <div className="my-10">
      <div className="text-center py-8 text-3xl">
        <Title text1="ALL" text2="ACTS" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 gap-y-6">
        {cards.length === 0 ? (
          <p className="col-span-full text-center text-gray-500">No acts to show yet.</p>
        ) : (
          cards.map((item) => (
            <div
              key={String(item.actId || item._id || item.id)}
              style={{ contentVisibility: "auto", containIntrinsicSize: "320px 420px" }}
            >
              <ActItem actData={item} />
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Acts;