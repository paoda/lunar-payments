import "./index.css";

import * as Square from "@square/web-sdk";
import { expect, unwrap } from "../util.ts";
import { Item, price, withSquareFee } from "../product.ts";
import { Rules } from "just-validate";
import JustValidate from "just-validate";

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
const toast = unwrap(document.querySelector("#payment-status"));

const validator = new JustValidate(form, {
  validateBeforeSubmitting: true,
});

validator
  .addField("#name", [{ rule: Rules.Required }])
  .addField("#email", [{ rule: Rules.Required }, { rule: Rules.Email }])
  .addField("#tanghulu", [{ rule: Rules.Number }])
  .addField("#dumpling", [{ rule: Rules.Number }]);

(function setInitialValues() {
  tanghuluPrice.innerHTML = formatCurrency(
    bigToNumber(updateItem(tanghulu, Item.Tanghulu)),
  );

  dumplingPrice.innerHTML = formatCurrency(
    bigToNumber(updateItem(dumpling, Item.Dumpling)),
  );

  const decimal = bigToNumber(updateTotal(tanghulu, dumpling));
  totalSpan.innerHTML = formatCurrency(decimal);
})();

tanghulu.oninput = () => {
  tanghuluPrice.innerHTML = formatCurrency(
    bigToNumber(updateItem(tanghulu, Item.Tanghulu)),
  );

  const decimal = bigToNumber(updateTotal(tanghulu, dumpling));
  totalSpan.innerHTML = formatCurrency(decimal);
};

dumpling.oninput = () => {
  dumplingPrice.innerHTML = formatCurrency(
    bigToNumber(updateItem(dumpling, Item.Dumpling)),
  );

  const decimal = bigToNumber(updateTotal(tanghulu, dumpling));
  totalSpan.innerHTML = formatCurrency(decimal);
};

(async () => {
  const payments = expect<Square.Payments>(
    await Square.payments(APP_ID, LOC_ID),
    "start Web Payments SDK",
  );

  const card = await payments.card();
  await card.attach("#card-container");

  cardButton.addEventListener("click", async (e) => {
    e.preventDefault();

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

      toast.classList.remove("hidden");
      toast.children[0].classList.remove("alert-error");
      toast.children[0].classList.add("alert-success");

      toast.children[0].innerHTML = "Payment Successful";
    } catch (e) {
      console.error(e);
      cardButton.innerHTML = "Pay";

      toast.classList.remove("hidden");
      toast.children[0].classList.remove("alert-success");
      toast.children[0].classList.add("alert-error");

      toast.children[0].innerHTML = "Payment Failed";
    }

    setInterval(() => toast.classList.add("hidden"), 10000);
  });
})();

function updateItem(element: HTMLInputElement, item: Item): bigint {
  let count: number = +element.value;

  if (count < 0) {
    count = 0;
    element.value = "0";
  }

  return withSquareFee(price(item) * BigInt(count), {
    flat: 30n / 2n,
    percent: 0.028,
  });
}

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

  const total = price(Item.Tanghulu) * BigInt(tCount) +
    price(Item.Dumpling) * BigInt(dCount);

  return withSquareFee(total);
}

function bigToNumber(num: bigint): number {
  return Number(num * 100n / 100n) / 100;
}

function formatCurrency(decimal: bigint | number): string {
  return Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(decimal);
}
