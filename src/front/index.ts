import * as Square from "@square/web-sdk";
import { expect, unwrap } from "../util.ts";
import { Item, price } from "../product.ts";

// @ts-ignore - Vite injects the Square App ID and Location ID
const APP_ID = import.meta.env.VITE_SQUARE_APP_ID;
// @ts-ignore - Vite injects the Square App ID and Location ID
const LOC_ID = import.meta.env.VITE_SQUARE_LOC_ID;

const name = document.getElementById("name") as HTMLInputElement;
const email = document.getElementById("email") as HTMLInputElement;
const reach = document.getElementById("reach") as HTMLInputElement;
const totalSpan = unwrap(document.getElementById("total"));
const tanghulu = document.getElementById(
  "tanghulu",
) as HTMLInputElement;
const dumpling = document.getElementById(
  "dumpling",
) as HTMLInputElement;

expect(name, "name <input /> should exist");
expect(email, "email <input /> should exist");
expect(reach, "reach <input /> should exist");
expect(tanghulu, "tanghulu <input /> should exist");
expect(dumpling, "dumpling <input /> should exist");

tanghulu.oninput = () => {
  const decimal = Number(updateTotal(tanghulu, dumpling) * 100n / 100n) / 100;
  totalSpan.innerHTML = `Total: $${decimal} CAD`;
};

dumpling.oninput = () => {
  const decimal = Number(updateTotal(tanghulu, dumpling) * 100n / 100n) / 100;
  totalSpan.innerHTML = `Total: $${decimal} CAD`;
};

const cardButton = unwrap(document.getElementById("card-button"));
const statusContainer = unwrap(
  document.getElementById("payment-status-container"),
);

(async () => {
  const payments = expect<Square.Payments>(
    await Square.payments(APP_ID, LOC_ID),
    "start Web Payments SDK",
  );

  const card = await payments.card();
  await card.attach("#card-container");

  cardButton.addEventListener("click", async () => {
    try {
      const result = await card.tokenize();

      if (result.status === "OK") {
        const res = await fetch("/payment/confirm", {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token: result.token,
            customer: {
              name: name.value,
              email: email.value,
              reach: reach.value,
            },
            order: {
              tanghulu: tanghulu.value,
              dumpling: dumpling.value,
            },
          }),
        });

        if (res.status !== 200) {
          throw new Error(`${res.status}": Faulty Request`);
        }

        console.debug(res);

        statusContainer.innerHTML = "Payment Successful";
      } else {
        let err = `Tokenization failed with status: ${result.status}`;
        if (result.errors) {
          err += ` and errors: ${JSON.stringify(result.errors)}`;
        }

        throw new Error(err);
      }
    } catch (e) {
      console.error(e);
      statusContainer.innerHTML = "Payment Failed";
    }
  });
})();

const updateTotal = (
  tanghulu: HTMLInputElement,
  dumpling: HTMLInputElement,
): bigint => {
  let tCount: number = +tanghulu.value;
  let dCount: number = +dumpling.value;

  if (tCount < 0) {
    tCount = 0;
    tanghulu.value = "0";
  }

  if (dCount < 0) {
    dCount = 0;
    dumpling.value = "0";
  }

  return price(Item.Tanghulu) * BigInt(tCount) +
    price(Item.Dumpling) * BigInt(dCount);
};
