import "./index.css";

import * as Square from "@square/web-sdk";
import { expect, unwrap } from "../util.ts";
import { Item, price } from "../product.ts";
import JustValidate from "just-validate";
import { Rules } from "just-validate";

// @ts-ignore - Vite injects the Square App ID and Location ID
const APP_ID = import.meta.env.VITE_SQUARE_APP_ID;
// @ts-ignore - Vite injects the Square App ID and Location ID
const LOC_ID = import.meta.env.VITE_SQUARE_LOC_ID;

const form = document.querySelector("form") as HTMLFormElement;

const name = document.querySelector("#name") as HTMLInputElement;
const email = document.querySelector("#email") as HTMLInputElement;
const reach = document.querySelector("#reach") as HTMLInputElement;
const totalSpan = unwrap(document.querySelector("#total"));
const tanghuluPrice = unwrap(document.querySelector("#tanghulu-price"));
const dumplingPrice = unwrap(document.querySelector("#dumpling-price"));

const tanghulu = document.querySelector("#tanghulu") as HTMLInputElement;
const dumpling = document.querySelector("#dumpling") as HTMLInputElement;

const cardButton = document.querySelector("#card-button") as HTMLInputElement;
const statusContainer = unwrap(
  document.querySelector("#payment-status-container"),
);

const validator: JustValidate.default = new JustValidate(form, {
  validateBeforeSubmitting: true,
});

validator
  .addField("#name", [{ rule: Rules.Required }])
  .addField("#email", [{ rule: Rules.Required }, { rule: Rules.Email }])
  .addField("#tanghulu", [{ rule: Rules.Number }])
  .addField("#dumpling", [{ rule: Rules.Number }]);

tanghuluPrice.innerHTML = `Tanghulu: $${
  Number(price(Item.Tanghulu) * 100n / 100n) / 100
} CAD`;

dumplingPrice.innerHTML = `Dumpling: $${
  Number(price(Item.Dumpling) * 100n / 100n) / 100
} CAD`;

const decimal = Number(updateTotal(tanghulu, dumpling) * 100n / 100n) / 100;
totalSpan.innerHTML = `Total: $${decimal} CAD`;

tanghulu.oninput = () => {
  const decimal = Number(updateTotal(tanghulu, dumpling) * 100n / 100n) / 100;
  totalSpan.innerHTML = `Total: $${decimal} CAD`;
};

dumpling.oninput = () => {
  const decimal = Number(updateTotal(tanghulu, dumpling) * 100n / 100n) / 100;
  totalSpan.innerHTML = `Total: $${decimal} CAD`;
};

(async () => {
  const payments = expect<Square.Payments>(
    await Square.payments(APP_ID, LOC_ID),
    "start Web Payments SDK",
  );

  const card = await payments.card();
  await card.attach("#card-container");

  cardButton.addEventListener("click", async (e) => {
    cardButton.innerHTML = "<span class='loading'></span>";

    const result = await card.tokenize();

    if (result.status !== "OK" || !validator.isFormValid()) {
      cardButton.innerHTML = "Pay";
      return;
    }

    try {
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

      cardButton.innerHTML = "Pay";
      cardButton.disabled = true;

      statusContainer.classList.remove("alert-error");
      statusContainer.classList.add("alert-success");
      statusContainer.classList.replace("invisible", "visible");

      statusContainer.innerHTML = "Payment Successful";
    } catch (e) {
      console.error(e);

      cardButton.innerHTML = "Pay";

      statusContainer.classList.remove("alert-success");
      statusContainer.classList.add("alert-error");
      statusContainer.classList.replace("invisible", "visible");

      statusContainer.innerHTML = "Payment Failed";
    }
  });
})();

function updateTotal(
  tanghulu: HTMLInputElement,
  dumpling: HTMLInputElement,
): bigint {
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
}
